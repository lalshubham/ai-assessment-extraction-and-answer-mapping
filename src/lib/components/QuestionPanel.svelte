<script lang="ts">
    import type { Exam, Assessment } from "$lib/types";

    interface Props {
        exam: Exam;
        assessment: Assessment | null;
        activeQuestionId: string | null;
    }

    let { exam, assessment, activeQuestionId = $bindable() }: Props = $props();

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
    <div class="flex items-center justify-between gap-1">
        <div class="text-center">
            {exam.grade_level || ""}
            {exam.subject || ""}
        </div>
        {#if assessment?.evaluations?.length}
            <div class="text-green-600 text-center">
                Total Score: {assessment.total_score} / {exam.total_marks}
            </div>
        {/if}
    </div>

    {#each exam.questions as q (q.id)}
        {@const ev = assessment?.evaluations?.find(
            (e) => e.question_id === q.id,
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

                {#if !ev || ev.status === "unanswered"}
                    <span class="text-sm text-red-600">Not Attempted</span>
                {:else}
                    <span
                        class="text-sm {ev.score_awarded === 0
                            ? 'text-red-600'
                            : ev.score_awarded < q.marks
                              ? 'text-orange-500'
                              : 'text-green-600'}"
                    >
                        {ev.score_string}
                    </span>
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
