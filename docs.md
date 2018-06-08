/createSurvey

{
  id: [questiontype, args ...]
}

example:
{
  title: "title",
  description: "description",
  access-token: "cookies123"
  questionList: {
    "1": ["shortanswer", "Do you have a pet?"],
    "2": ["longanswer", "Describe your house."],
    "3": ["multiplechoice", "What is your favorite type of chocolate?", ["Dark", "Milk", "Orange"]]
  }
}

{
  access-token: "cookies",
  response: {
    'Question1': adfaafa,
    ''
  }
}
