#THIS FILE IS USED TO TEST THE QUERYING OF THE LEGAL DATABASE
from flask import Flask, request, jsonify
import sqlite3
import re
import os

app = Flask(__name__)

# Function to create a database connection
def create_connection(db_file):
    """ create a database connection to the SQLite database specified by the db_file """
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except sqlite3.Error as e:
        print(e)
    return conn


def fetch_article(article_number, source, db_file='legal_articles.db'):
    conn = create_connection(db_file)
    if conn is not None:
        cur = conn.cursor()
        try:
            # Log the query and its parameters
            print(f"Executing query with article_number: {article_number}, source: {source}")
            cur.execute("SELECT content FROM articles WHERE article_number=? AND source=?", (article_number, source))
            result = cur.fetchone()
            if result:
                return result[0]
            else:
                print(f"No article found for number: '{article_number}' and source: '{source}'")
                return "Article not found."
        except sqlite3.Error as e:
            print(f"An error occurred: {e}")
        finally:
            conn.close()
    else:
        return "Failed to connect to the database."


    
# Function to process queries
def process_query(query):
    """Process a query in the format 'article_number=XXX, source='YYY'' to fetch legal article content"""
    # Adjust the regex to match the new query format 'article_number=XXX, source='YYY''
    match = re.search(r"article_number=(\d+),\s*source='([^']+)'", query)
    if match:
        article_number = match.group(1)  # Extracted article number as a string
        source = match.group(2)  # Extracted source
        content = fetch_article(article_number, source)
        return f"Artículo {article_number} del {source}: {content}"
    else:
        return "Query does not match article request pattern."



@app.route('/fetch_article', methods=['POST'])
def handle_fetch_article():
    data = request.json
    print(f"Received data: {data}")  # Logging for debugging
    query = data.get('query', '')  # Default to empty string if query not provided
    print(f"Received query: {query}")  # Temporary logging
    response = process_query(query)
    print(response)
    return jsonify({'response': response})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))