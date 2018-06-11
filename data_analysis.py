from flask import Flask, request
import csv
import json

application = Flask(__name__)

@application.route("/")
def hello():
    return "Hello World!"

@application.route("/csv")
def getCSV():
    print(request.data)
    responseContent = json.loads(request.data["responseContent"])
    print(responseContent[0].keys())
    #f = csv.writer(open("data.csv", "wb+"))
    return "success"

if __name__ == "__main__":
    application.run(host='0.0.0.0', port=8081)
