import sqlite3

def delete_article_by_number(db_path, article_number):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    
    # Create a cursor object
    cur = conn.cursor()
    
    # Execute the DELETE statement
    cur.execute("DELETE FROM articles WHERE article_number = ?", (article_number,))
    
    # Commit the changes
    conn.commit()
    
    # Close the connection
    conn.close()

# Example usage
db_path = 'legal_articles.db'
article_number = '845'
delete_article_by_number(db_path, article_number)