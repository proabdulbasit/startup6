import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatPromptTemplate } from 'langchain/prompts';
import { RunnableSequence } from 'langchain/schema/runnable';
import { StringOutputParser } from 'langchain/schema/output_parser';
import type { Document } from 'langchain/document';
import type { VectorStoreRetriever } from 'langchain/vectorstores/base';
import MistralClient from '@mistralai/mistralai';
const CONDENSE_TEMPLATE = `Responde la pregunta

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;

const QA_TEMPLATE = `Eres un abogado uruguayo experto. Utiliza los siguientes fragmentos de contexto para responder a la pregunta al final. Si no sabes la respuesta, simplemente di que no la sabes. NO intentes inventar una respuesta. Si la pregunta no está relacionada con el contexto o el historial de chat, responde cortésmente que solo estás sintonizado para responder preguntas relacionadas con el contexto.

<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
Helpful answer in markdown:`;

const combineDocumentsFn = (docs: Document[], separator = '\n\n') => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join(separator);
};

const mistralApiKey = process.env.MISTRAL_API_KEY; // Assume the API key is set in the environment
const mistralClient = new MistralClient(mistralApiKey);

export const reformulateQuestion = async (question: string): Promise<string> => {
  try {
    const prompt = `Dada la pregunta: "${question}", necesito que reformules esta pregunta en un formato muy específico y simplificado. La reformulación debe seguir el formato exacto "article_number=XXX, source='YYY'", donde XXX es el número del artículo y YYY es la fuente, que puede ser "Codigo Civil", "Codigo Aguas" , "Codigo Penal", "Codigo de la Niñez y Adolescencia", "Codigo general del proceso", "Codigo de Comercio", "Codigo Aduanero", "Codigo de proceso penal", "Codigo rural", "Codigo Tributario", "Constitucion nacional", "Ley de acoso sexual", "Ley de caducidad", "Ley de empresas publicas", "Ley de rotulado de alimentos", "Ley de seguridad estado y orden interno", "Ley de trabajo sexual", "Ley de transito y seguridad vial". Por ejemplo, si la pregunta original es "¿Qué dice el artículo 230 del código de aguas?", tu respuesta debe ser únicamente: "article_number=230, source='Codigo Aguas'". No incluyas ninguna otra palabra, frase, signos de puntuación adicionales, explicaciones, ni escapes de caracteres como guiones bajos. La respuesta debe ser precisa y en este formato específico. SOLO INCLUYE LA RESPUESTA EN ESPAÑOL, NO PONGAS NADA EN INGLÉS. Asegúrate de no escapar el guion bajo en "article_number".`;

    const chatResponse = await mistralClient.chat({
      model: 'mistral-tiny',
      messages: [{ role: 'user', content: prompt }],
    });

    const reformulatedQuestion = chatResponse.choices[0].message.content.trim();
    // Remove backslashes if present
    const cleanQuestion = reformulatedQuestion.replace(/\\/g, '');
    console.log('Pregunta Reformulada:', cleanQuestion);
    return cleanQuestion;
  } catch (error) {
    console.error('Error al reformular la pregunta:', error);
    return question; // Return the original question in case of an error
  }
};




  // Function to determine if the question is structured or unstructured
export const isQuestionStructured = async (question: string): Promise<boolean> => {
    try {
      // Adjust the prompt to dynamically include the user's question
      const prompt = `Considera la siguiente pregunta para determinar su estructura: "${question}". Evalúa si la pregunta es estructurada o no basándote en estos criterios: Una pregunta se considera estructurada si solicita información muy específica y directamente contestable con un dato concreto, como por ejemplo preguntas que se refieren a contenido legal específico diciendo "¿Qué dice el artículo X?". Este tipo de preguntas son estructuradas porque buscan una respuesta directa basada en un hecho concreto sin necesidad de análisis o interpretación adicional. 

      Si la pregunta formulada es similar a "¿Qué dice el artículo 99?" o cualquier otro número de artículo, y solicita información directa de un texto legal o fuente específica sin requerir interpretación, análisis o contexto adicional para su respuesta, entonces considera la pregunta como estructurada y devuelve "sí". 
      
      Por otro lado, si la pregunta requiere de una comprensión más profunda, análisis o interpretación para ser respondida adecuadamente, y no se limita a solicitar un dato concreto o la cita de un texto, entonces es considerada no estructurada. En este caso, la pregunta va más allá de solicitar información directamente contestable y requiere una evaluación o razonamiento adicional para proporcionar una respuesta, por lo tanto, devuelve ÚNICAMENTE "no".
      Además, si el contenido es muy largo, considera que es una pregunta no estructurada.
      SI LA PREGUNTA ES ESTRUCTURADA RESPONDE SOLAMENTE CON UN "SI", NADA MAS, SI LA PREGUNTA NO ES ESTRUCTURADA RESPONDE CON UN "NO", NADA MAS. SOLO PODES RESPONDER CON UN "SI" O CON UN "NO", NO EXPLIQUES NADA MAS.`
      ;
      
      const chatResponse = await mistralClient.chat({
        model: 'mistral-tiny',
        messages: [{ role: 'user', content: prompt }],
      });

      // Log the model's response to ensure it is adhering to the prompt
      console.log('Chat:', chatResponse.choices[0].message.content);

      // Check if the response is exactly "yes" to determine if the question is structured
      const response = chatResponse.choices[0].message.content.trim().toLowerCase();     
      const responseIsYes = !(response === "No." || response.includes('no.') || response.includes('analysis') || response.includes('understanding') || response.includes('applies to a specific legal concept') || response.includes('no es estructurada'));
      return responseIsYes;
    } catch (error) {
      console.error('Error determining question structure:', error);
      return false;  // Default to false in case of error
    }
  };



export const makeChain = (retriever: VectorStoreRetriever) => {
  
  
  

  const condenseQuestionPrompt = ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE);
  const answerPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE);

  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-4',
  });

  const standaloneQuestionChain = RunnableSequence.from([
    condenseQuestionPrompt,
    model,
    new StringOutputParser(),
  ]);
  const retrievalChain = retriever.pipe(combineDocumentsFn);
  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([
        (input) => input.question,
        retrievalChain,
      ]),
      chat_history: (input) => input.chat_history,
      question: (input) => input.question,
    },
    answerPrompt,
    model,
    new StringOutputParser(),
  ]);
  

// First generate a standalone question, then answer it based on
  // chat history and retrieved context documents.
  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      question: standaloneQuestionChain,
      chat_history: (input) => input.chat_history,
    },
    answerChain,
  ]);

  return conversationalRetrievalQAChain;
};