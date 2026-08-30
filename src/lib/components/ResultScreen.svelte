<script lang="ts">
    import type { Exam, Assessment } from "$lib/types";
    import QuestionPanel from "./QuestionPanel.svelte";
    import AnswerPanel from "./AnswerPanel.svelte";

    interface Props {
        exam: Exam | null;
        assessment: Assessment | null;
        answerImages: string[];
    }

    let { exam, assessment, answerImages }: Props = $props();

    let activeQuestionId = $state<string | null>(null);
    let activeTab = $state<"questions" | "answers">("questions");
</script>

<div class="h-full min-h-0 flex flex-col gap-4">
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div
                class="md:block h-full min-h-0 {activeTab === 'questions'
                    ? 'block'
                    : 'hidden'}"
            >
                <QuestionPanel {exam} {assessment} bind:activeQuestionId />
            </div>
            <div
                class="md:block h-full min-h-0 {activeTab === 'answers'
                    ? 'block'
                    : 'hidden'}"
            >
                <AnswerPanel {answerImages} {assessment} {activeQuestionId} />
            </div>
        </div>
    {/if}
</div>
