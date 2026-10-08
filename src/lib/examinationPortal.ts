export const examinationPortalUrl = process.env.NEXT_PUBLIC_EXAM_PORTAL_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://exam.iodghana.org");

// Preserve the existing CMS navigation item, including its label and position.
export function examinationHref(href: string) {
  return href.replace(/\/$/, "") === "/training/exams" ? examinationPortalUrl : href;
}
