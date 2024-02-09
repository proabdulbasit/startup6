// Import necessary dependencies and functions
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain'; // Adjust this import path as necessary
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { isQuestionStructured } from '@/utils/makechain'; // Ensure this path is correct
import { reformulateQuestion } from '@/utils/makechain';
import axios from 'axios';

async function handleStructuredQuestion(question: string): Promise<string> {
  try {

      const reformulatedQuestion = await reformulateQuestion(question);
      
      const response = await axios.post('http://localhost:5000/fetch_article', JSON.stringify({
          query: reformulatedQuestion
      }), {
          headers: {
              'Content-Type': 'application/json'
          }
      });
      return response.data.response; // Use the response from your Flask app
  } catch (error) {
      console.error('Error calling the legal database service:', error);
      return "There was an error processing your request.";
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history } = req.body;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    res.status(400).json({ message: 'No question in the request' });
    return;
  }

  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  const structured = await isQuestionStructured(sanitizedQuestion);

  if (structured) {
    // For structured questions, fetch the article content from the legal database
    const articleResponse = await handleStructuredQuestion(sanitizedQuestion);
    res.status(200).json({ text: articleResponse, sourceDocuments: [] });
  } else {
    // Your existing logic for handling unstructured questions
    try {
      const index = pinecone.Index(PINECONE_INDEX_NAME);

      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({}),
        {
          pineconeIndex: index,
          textKey: 'text',
          namespace: PINECONE_NAME_SPACE,
        },
      );

      let resolveWithDocuments: (value: Document[]) => void;
      const documentPromise = new Promise<Document[]>((resolve) => {
        resolveWithDocuments = resolve;
      });

      const retriever = vectorStore.asRetriever({
        callbacks: [
          {
            handleRetrieverEnd(documents) {
              resolveWithDocuments(documents);
            },
          },
        ],
      });

      const chain = makeChain(retriever);

      const pastMessages = history
        .map((message: [string, string]) => {
          return [`Human: ${message[0]}`, `Assistant: ${message[1]}`].join('\n');
        })
        .join('\n');

      const response = await chain.invoke({
        question: sanitizedQuestion,
        chat_history: pastMessages,
      });

      const sourceDocuments = await documentPromise;

      res.status(200).json({ text: response, sourceDocuments });
    } catch (error: any) {
      console.log('error', error);
      res.status(500).json({ error: error.message || 'Something went wrong' });
    }
  }
}
