export const queryKeys = {
  adminDashboard: ["admin-dashboard"],
  students: ["students"],
  subjects: ["subjects"],
  subjectTree: (subjectId) => ["subject-tree", subjectId],
  adminAssessments: ["admin-assessments"],
  studentDashboard: ["student-dashboard"],
  studentAssessments: ["student-assessments"],
};

export function invalidateLearningQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
  queryClient.invalidateQueries({ queryKey: ["subject-tree"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminAssessments });
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.studentAssessments });
}
