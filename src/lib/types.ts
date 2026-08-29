export type ImageData = {
    blob: Blob;
    dataUrl: string
};

export type ExamMetadata = {
    grade_level?: string;
    subject?: string;
};

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
    marks?: number;
    options?: string[];
    marks_equation?: string;
};

export type Evaluation = {
    question_id: string;
    status: 'answered' | 'unanswered';
    score_awarded?: number;
    score_string?: string;
    feedback?: string;
    page_index?: number;
    bounding_box?: [number, number, number, number];
};

export type ExtractionResponse = {
    metadata: ExamMetadata;
    questions: Question[];
};

export type EvaluationResponse = {
    evaluations: Evaluation[];
};