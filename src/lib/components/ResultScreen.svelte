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
    {#if exam?.questions?.length}
        <div
            class="w-full p-1 flex md:hidden gap-1 shrink-0 bg-white rounded-4xl"
        >
            <button
                onclick={() => (activeTab = "questions")}
                class="py-2.5 flex-1 font-medium rounded-4xl transition-bg duration-200 cursor-pointer {activeTab ===
                'questions'
                    ? 'bg-[rgb(61,61,61)] hover:bg-black text-white shadow-lg'
                    : ''}"
            >
                Questions
            </button>
            <button
                onclick={() => (activeTab = "answers")}
                class="py-2.5 flex-1 font-medium rounded-4xl transition-bg duration-200 cursor-pointer {activeTab ===
                'answers'
                    ? 'bg-[rgb(61,61,61)] hover:bg-black text-white shadow-lg'
                    : ''}"
            >
                Answer Sheet
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
