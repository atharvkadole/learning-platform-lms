const choiceQuestionTypes = ["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE"];

export function createDefaultQuestion(displayOrder = 1) {
  return {
    text: "",
    type: "MCQ",
    difficulty: "MEDIUM",
    points: 1,
    correctTextAnswer: "",
    displayOrder,
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

export function normalizeQuestionForForm(question, index = 0) {
  const options = question.options?.length
    ? question.options.map((option) => ({ text: option.text || "", isCorrect: Boolean(option.isCorrect) }))
    : [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ];

  return {
    text: question.text || "",
    type: question.type || "MCQ",
    difficulty: question.difficulty || "MEDIUM",
    points: question.points ?? 1,
    correctTextAnswer: question.correctTextAnswer || "",
    displayOrder: question.displayOrder ?? index + 1,
    options,
  };
}

export function normalizeQuestionsForPayload(questions = []) {
  return questions
    .filter((question) => question.text?.trim())
    .map((question, index) => {
      const isChoiceQuestion = choiceQuestionTypes.includes(question.type);
      return {
        text: question.text.trim(),
        type: question.type,
        difficulty: question.difficulty || "MEDIUM",
        points: Number(question.points) || 1,
        correctTextAnswer: question.type === "FILL_IN_BLANK" ? question.correctTextAnswer?.trim() || undefined : undefined,
        displayOrder: Number(question.displayOrder) || index + 1,
        options: isChoiceQuestion
          ? (question.options || [])
              .filter((option) => option.text?.trim())
              .map((option) => ({ text: option.text.trim(), isCorrect: Boolean(option.isCorrect) }))
          : [],
      };
    });
}
