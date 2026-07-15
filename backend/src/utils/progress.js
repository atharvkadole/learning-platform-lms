export function calculateModuleCompletion({ materialCount, masteredCount, assessmentPassed }) {
  if (!materialCount) {
    return assessmentPassed ? 100 : 0;
  }

  const learningPercent = (masteredCount / materialCount) * 50;
  const assessmentPercent = assessmentPassed ? 50 : 0;
  return Math.round((learningPercent + assessmentPercent) * 100) / 100;
}

export function statusFromCompletion(completionPercent) {
  if (completionPercent >= 100) return "MASTERED";
  if (completionPercent > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}
