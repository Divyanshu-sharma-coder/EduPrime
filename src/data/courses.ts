export type Course = {
  slug: string;
  title: string;
  subject: string;
  level: string;
  duration: string;
  students: string;
  accent: string;
  category: string;
  language: string;
  teacher: string;
  rating: number;
  price: number;
  description: string;
};

export const courses: Course[] = [
  { slug: "mathematics-made-visual", title: "Mathematics, made visual", subject: "Mathematics", level: "Grade 10", duration: "12 weeks", students: "2.4k learners", accent: "violet", category: "School", language: "English", teacher: "Ananya Shah", rating: 4.9, price: 799, description: "Build a confident foundation with visual explanations, focused practice and a teacher who makes every step feel possible." },
  { slug: "physics-for-curious-minds", title: "Physics for curious minds", subject: "Physics", level: "JEE Foundation", duration: "16 weeks", students: "1.8k learners", accent: "teal", category: "JEE", language: "English", teacher: "Rahul Kapoor", rating: 4.8, price: 1499, description: "Understand the ideas behind the equations through live problem-solving, replayable lessons and deliberate practice." },
  { slug: "biology-the-living-world", title: "Biology: the living world", subject: "Biology", level: "NEET Foundation", duration: "10 weeks", students: "3.1k learners", accent: "gold", category: "NEET", language: "English", teacher: "Meera Sethi", rating: 4.9, price: 1299, description: "Turn a large syllabus into a memorable map with clear diagrams, active recall and supportive revision rooms." },
  { slug: "chemistry-with-clarity", title: "Chemistry, with clarity", subject: "Chemistry", level: "JEE Foundation", duration: "14 weeks", students: "1.2k learners", accent: "teal", category: "JEE", language: "Hindi", teacher: "Dev Malhotra", rating: 4.7, price: 999, description: "Move from memorising reactions to seeing the patterns that make chemistry click." },
  { slug: "english-writing-studio", title: "English writing studio", subject: "English", level: "Grade 9", duration: "8 weeks", students: "980 learners", accent: "violet", category: "School", language: "English", teacher: "Ishita Rao", rating: 4.8, price: 699, description: "Find your voice with practical writing workshops, useful feedback and a generous pace." },
  { slug: "foundations-of-coding", title: "Foundations of coding", subject: "Computer Science", level: "Grade 8", duration: "9 weeks", students: "1.5k learners", accent: "gold", category: "Skills", language: "English", teacher: "Arjun Nair", rating: 4.9, price: 899, description: "Learn to think in code through small projects that turn curiosity into confidence." },
];
