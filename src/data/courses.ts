export type Course = {
  title: string;
  subject: string;
  level: string;
  duration: string;
  students: string;
  accent: string;
};

export const courses: Course[] = [
  { title: "Mathematics, made visual", subject: "Mathematics", level: "Grade 10", duration: "12 weeks", students: "2.4k learners", accent: "violet" },
  { title: "Physics for curious minds", subject: "Physics", level: "JEE Foundation", duration: "16 weeks", students: "1.8k learners", accent: "teal" },
  { title: "Biology: the living world", subject: "Biology", level: "NEET Foundation", duration: "10 weeks", students: "3.1k learners", accent: "gold" },
];
