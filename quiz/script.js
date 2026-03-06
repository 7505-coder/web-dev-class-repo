const startButton = document.getElementById("start-btn");
const nextButton = document.getElementById("next-btn");

const questionContainerElement = document.getElementById("question-container");
const questionElement = document.getElementById("question");
const answerButtonsElement = document.getElementById("answer-buttons");
const scoreContainerElement = document.getElementById("score");
const scoreElement = document.getElementById("right-answers");
const totalScoreContainerElement = document.getElementById("total-score-container");
const totalScoreElement = document.getElementById("total-score");

let shuffledQuestions, currentQuestionIndex;
let quizScore = 0;

startButton.addEventListener("click", startGame);
nextButton.addEventListener("click", () => {
  currentQuestionIndex++;
  setNextQuestion();
});

function startGame() {
  if (startButton.innerText === "Restart") {
    quizScore = 0;
    currentQuestionIndex = 0;
    startButton.innerText = "Start";
    scoreContainerElement.style.display = "none";
    nextButton.classList.add("hide");
    totalScoreContainerElement.style.display = "none";
  }
  startButton.classList.add("hide");
  scoreContainerElement.style.display = "flex";
  scoreElement.innerText = quizScore;
  shuffledQuestions = questions.sort(() => Math.random() - 0.5);
  currentQuestionIndex = 0;
  questionContainerElement.classList.remove("hide");
  setNextQuestion();
}

function setNextQuestion() {
  resetState();
  showQuestion(shuffledQuestions[currentQuestionIndex]);
}

function showQuestion(question) {
  questionElement.innerText = question.question;

  question.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.innerText = answer.text;
    button.classList.add("btn");

    if (answer.correct) {
      button.dataset.correct = answer.correct;
    }

    button.addEventListener("click", selectAnswer);
    answerButtonsElement.appendChild(button);
  });
}

function resetState() {
  clearStatusClass(document.body);
  nextButton.classList.add("hide");

  while (answerButtonsElement.firstChild) {
    answerButtonsElement.removeChild(answerButtonsElement.firstChild);
  }
}

function selectAnswer(e) {
  const selectedButton = e.target;
  const correct = selectedButton.dataset.correct;

  Array.from(answerButtonsElement.children).forEach((button) => {
    setStatusClass(button, button.dataset.correct);
  });

  if (shuffledQuestions.length > currentQuestionIndex + 1) {
    nextButton.classList.remove("hide");
  } else {
    startButton.innerText = "Restart";
    startButton.classList.remove("hide");
    questionContainerElement.classList.add("hide");
    totalScoreContainerElement.style.display = "flex";
    scoreContainerElement.style.display = "none";
  }

  if (correct) {
    quizScore++;
  }

  scoreElement.innerText = quizScore;
  totalScoreElement.innerText = `${quizScore}/${shuffledQuestions.length}`;
}

function setStatusClass(element, correct) {
  clearStatusClass(element);

  if (correct) {
    element.classList.add("correct");
  } else {
    element.classList.add("wrong");
  }
}

function clearStatusClass(element) {
  element.classList.remove("correct");
  element.classList.remove("wrong");
}

const questions = [
  {
    question: "Which one of these is a JavaScript framework?",
    answers: [
      { text: "Eclipse", correct: false },
      { text: "Ruby", correct: false },
      { text: "React", correct: true },
      { text: "Django", correct: false },
    ],
  },
  {
    question: "Who is the founder of Microsoft?",
    answers: [
      { text: "Bill Gates", correct: true },
      { text: "Steve Jobs", correct: false },
      { text: "Jeff Bezos", correct: false },
      { text: "Elon Musk", correct: false },
    ],
  },
  {
    question: "What does HTML stand for?",
    answers: [
      { text: "Hypertext Markup Language", correct: true },
      { text: "Hypertext Markdown Language", correct: false },
      { text: "Hyperloop Machine Language", correct: false },
      { text: "Helicopters Terminals Motorboats Lamborginis", correct: false },
    ],
  },
  {
    question: "What year was JavaScript launched?",
    answers: [
      { text: "1996", correct: true },
      { text: "1995", correct: false },
      { text: "1994", correct: false },
      { text: "none of the above", correct: false },
    ],
  },
  {
    question: "What does CSS stand for?",
    answers: [
      { text: "Cascading Style Sheet", correct: true },
      { text: "Cascading Style Sheep", correct: false },
      { text: "Cascading Supersheet", correct: false },
      { text: "Cascading Style Sheep", correct: false },
    ],
  },
];
