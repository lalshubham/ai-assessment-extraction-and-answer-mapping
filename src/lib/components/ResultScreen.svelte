<script lang="ts">
    import type { Exam, Assessment } from "$lib/types";
    import QuestionPanel from "./QuestionPanel.svelte";
    import AnswerPanel from "./AnswerPanel.svelte";

    interface Props {
        exam: Exam | null;
        assessment: Assessment | null;
        answerImages: string[];
        onReset: () => void;
        onReExtract: () => void;
        onReEvaluate: () => void;
    }

    let {
        exam,
        assessment,
        answerImages,
        onReset,
        onReExtract,
        onReEvaluate,
    }: Props = $props();

    let activeQuestionId = $state<string | null>(null);
    let activeTab = $state<"questions" | "answers">("questions");
</script>

<div class="flex flex-col gap-4">
    <div
        class="flex flex-col md:flex-row items-center justify-between gap-4 border p-3 bg-white shrink-0"
    >
        <div class="text-gray-800 px-2 w-full md:w-auto text-center">
            Assessment Complete
        </div>
        <div class="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <button
                onclick={onReset}
                class="px-4 py-2 border bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm"
            >
                Upload New
            </button>
            <button
                onclick={onReExtract}
                class="px-4 py-2 border bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer text-sm"
            >
                Re-Extract
            </button>
            <button
                onclick={onReEvaluate}
                class="px-4 py-2 border bg-black text-white hover:bg-gray-800 cursor-pointer text-sm"
            >
                Re-Evaluate
            </button>
        </div>
    </div>

    {#if exam?.questions?.length}
        <div class="flex md:hidden w-full p-1 border shrink-0">
            <button
                onclick={() => (activeTab = "questions")}
                class="flex-1 py-2 text-sm {activeTab === 'questions'
                    ? 'bg-black text-white'
                    : ''}"
            >
                Questions
            </button>
            <button
                onclick={() => (activeTab = "answers")}
                class="flex-1 py-2 text-sm {activeTab === 'answers'
                    ? 'bg-black text-white'
                    : ''}"
            >
                Answer Sheets
            </button>
        </div>

        <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0"
        >
            <div
                class="h-full overflow-hidden {activeTab === 'questions'
                    ? 'block'
                    : 'hidden'} md:block"
            >
                <QuestionPanel {exam} {assessment} bind:activeQuestionId />
            </div>
            <div
                class="h-full overflow-hidden {activeTab === 'answers'
                    ? 'block'
                    : 'hidden'} md:block"
            >
                <AnswerPanel {answerImages} {assessment} {activeQuestionId} />
            </div>
        </div>
    {/if}
</div>
