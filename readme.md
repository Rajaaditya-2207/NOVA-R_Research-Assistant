# NOVA-R: The AI Research Assistant

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python Version](https://img.shields.io/badge/python-3.9%2B-brightgreen)
![Framework](https://img.shields.io/badge/Flask-2.3-orange)
![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=nova-r-research-assistant)

An intelligent, web-based research assistant powered by the NVIDIA API and built with Flask. NOVA-R provides a clean, minimalist interface for users to ask complex questions and receive insightful, AI-generated answers in real-time.

## ✨ Features

-   **AI-Powered Responses:** Leverages the power of OpenAI's models to provide detailed and context-aware answers.
-   **Minimalist UI:** A clean and responsive user interface that focuses on the conversation.
-   **Lightweight Backend:** Built with the fast and efficient Flask micro-framework.
-   **Easy Setup:** Get the project running locally in just a few minutes with standard Python tools.
-   **Ready for Deployment:** Includes a `vercel.json` configuration for seamless deployment to Vercel.

## 🛠️ Tech Stack

-   **Backend:** Python, Flask
-   **AI:** NVIDIA API
-   **Frontend:** HTML, Tailwind CSS (via CDN)
-   **Deployment:** Vercel

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following installed on your system:
-   [Python 3.9+](https://www.python.org/downloads/)
-   [pip](https://pip.pypa.io/en/stable/installation/) (comes with Python)
-   [Git](https://git-scm.com/)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/Rajaaditya-2207/NOVA-R_Research-Assistant.git](https://github.com/Rajaaditya-2207/NOVA-R_Research-Assistant.git)
    cd NOVA-R_Research-Assistant
    ```

2.  **Create a Virtual Environment**
    It's highly recommended to use a virtual environment to manage project dependencies.
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install Dependencies**
    Install all the required Python packages from the `requirements.txt` file.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set Up Environment Variables**
    You need an NVIDIA API key to use the application. The project uses a `.env` file to manage this key securely.
    -   Rename the example file `.env.example` to `.env`.
    -   Open the new `.env` file and add your NVIDIA API key.

    **File: `.env`**
    ```
    NVIDIA_API_KEY="YourApiKeyHere"
    ```

### Running the Application

Once the installation is complete, you can start the Flask development server.

```bash
flask run
