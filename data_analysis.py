from flask import Flask, request, send_file
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
    print("hERE")
    print(list(responseContent[0].keys()))
    f = csv.writer(open("data.csv", "w"))
    #f.writerow(list(responseContent[0].keys()))
    for response in responseContent:
        row = []
        for key in responseContent[0].keys():
            row.append(response[key])
        print(row)
        f.writerow(row)
    try:
        return send_file('./data.csv')
    except Exception as e:
        return str(e)

    #return "hi"

if __name__ == "__main__":
    application.run(host='0.0.0.0', port=8081)
