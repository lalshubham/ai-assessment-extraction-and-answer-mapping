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
    grade_level: string;
    subject: string;
    total_marks: number;
    items: QuestionItem[];
};

export type QuestionItem = {
    id: string;
    text: string;
    marks: number;
    options?: string[];
    marks_equation?: string;
    parent_total_marks?: number;
};

export type Answer = {
    total_score: number;
    items: AnswerItem[];
};

export type AnswerItem = {
    question_id: string;
    status: 'answered' | 'unanswered';
    score_awarded: number;
    score_string: string;
    feedback: string;
    regions: AnswerRegion[];
    pages_found_on?: number[];
    transcribed_text?: string;
};

export type AnswerRegion = {
    page_index: number;
    bounding_box: [number, number, number, number];
};