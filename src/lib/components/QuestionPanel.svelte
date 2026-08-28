<script lang="ts">
    import type { ExamMetadata, Question, Evaluation } from "$lib/types";

    let {
        examMeta,
        questions,
        evaluations,
        activeQuestionId = $bindable(),
        totalScore,
        totalMaxMarks,
    } = $props<{
        examMeta: ExamMetadata | null;
        questions: Question[];
        evaluations: Evaluation[];
        activeQuestionId: string | null;
        totalScore: number;
        totalMaxMarks: number;
    }>();

    function toggleQuestion(id: string) {
        activeQuestionId = activeQuestionId === id ? null : id;
        const element = document.getElementById(`box-${activeQuestionId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
</script>

<div
    class="flex flex-col gap-2 w-full h-full overflow-y-auto border p-2 bg-white"
>
    {#if examMeta}
        <div class="flex items-center justify-between gap-1">
            <div class="text-center">
                {examMeta.grade_level || ""}
                {examMeta.subject || ""}
            </div>
            {#if evaluations.length > 0}
                <div class="text-green-600 text-center">
                    Total Score: {totalScore} / {totalMaxMarks}
                </div>
            {/if}
        </div>
    {/if}

    {#each questions as q (q.id)}
        {@const ev = evaluations.find(
            (e: Evaluation) => e.question_id === q.id,
        )}

        <button
            type="button"
            class="flex flex-col gap-2 p-3 border cursor-pointer text-left w-full duration-200 {activeQuestionId ===
            q.id
                ? 'bg-gray-100 border-black'
                : 'bg-transparent border-gray-200 hover:bg-gray-50'}"
            onclick={() => toggleQuestion(q.id)}
        >
            <div class="flex justify-between items-center w-full">
                <strong>Question {q.id}</strong>
                {#if ev}
                    {#if ev.status === "unanswered"}
                        <span class="text-red-600 text-xs">
                            Not Attempted
                        </span>
                    {:else}
                        <span
                            class="text-sm {ev.score_awarded ===
                            q.marks
                                ? 'text-green-600'
                                : 'text-orange-500'}"
                        >
                            {ev.score_string}
                        </span>
                    {/if}
                {/if}
            </div>
            <p class="text-sm leading-relaxed">{q.text}</p>
            {#if q.options && q.options.length > 0}
                <div class="text-sm border-gray-300">
                    {#each q.options as opt (opt)}
                        <div class="py-0.5">{opt}</div>
                    {/each}
                </div>
            {/if}
            {#if activeQuestionId === q.id && ev?.feedback}
                <div class="text-sm w-full">
                    <strong>Feedback:</strong>
                    {ev.feedback}
                </div>
            {/if}
        </button>
    {/each}
</div>
