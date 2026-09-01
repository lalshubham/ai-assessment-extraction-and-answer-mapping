export type ScreenStage = 'upload' | 'loading' | 'results';

export type LoadingStage = 'processing' | 'extracting' | 'evaluating';

export type ResultStage = 'questions' | 'answers';

export type GeminiContent = {
    text: string;
} | {
    inlineData: {
        data: string;
        mimeType: string;
    };
};

export type Question = {
    id: string;
    text: string;
    marks: number;
    options?: string[];
};

export type Exam = {
    grade_level: string;
    subject: string;
    total_marks: number;
    questions: Question[];
};

export type AnswerRegion = {
    page_index: number;
    bounding_box: [number, number, number, number];
};

export type Evaluation = {
    question_id: string;
    status: 'answered' | 'unanswered';
    score_awarded: number;
    score_string: string;
    feedback: string;
    regions: AnswerRegion[];
};

export type Assessment = {
    total_score: number;
    evaluations: Evaluation[];
};