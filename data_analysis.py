from flask import Flask, request
import csv
import json

application = Flask(__name__)

@application.route("/")
def hello():
    return "Hello World!"

@application.route("/csv", methods=['POST'])
def getCSV():
    print("CSVVVVVV")
    data = json.loads(request.data)
    print(type(data))
    print(data["responseContent"])
    #rint(request.data)
    responseContent = data["responseContent"]
    print(responseContent[0].keys())
    #f = csv.writer(open("data.csv", "wb+"))
    return "success"

if __name__ == "__main__":
    application.run(host='0.0.0.0', port=8081)
