from flask import Flask, request, jsonify
import sqlite3
import re

app = Flask(__name__)

def create_connection(db_file):
    """Create a database connection to the SQLite database specified by db_file"""
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



def process_query(query):
    """Process a simplified query format to identify and fetch legal article content"""
    # Adjusted regex to match the new query format
    match = re.search(r'article_number=(\d+),\s*source="([^"]+)"', query, re.IGNORECASE)
    if match:
        article_number = match.group(1)  # Extracted article number as a string
        source = match.group(2)  # Extracted source
        content = fetch_article(article_number, source)
        return f"Artículo {article_number} del {source}: {content}"
    else:
        return "Query does not match article request pattern."


if __name__ == '__main__':
    # Example query in the specified format
    test_query = 'article_number=872, source="Codigo Civil"'
    print("Realizando consulta de prueba...")
    response = process_query(test_query)
    print(response)
