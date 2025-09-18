from flask import session

def current_user():
    return session.get("user", None)

def is_logged_in():
    return "user" in session
