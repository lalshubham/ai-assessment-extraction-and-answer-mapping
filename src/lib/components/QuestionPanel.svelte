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

<div class="p-4 flex flex-col gap-4 bg-[#f0f0f0] rounded-2xl">
    <p class="font-semibold text-lg text-center text-[#2b2b2b]">
        Extracted Questions
    </p>

    {#each exam.questions as q (q.id)}
        {@const ev = assessment?.evaluations?.find(
            (e) => e.question_id === q.id,
        )}

        <button
            type="button"
            class="p-3 flex flex-col gap-2 text-left w-full bg-white duration-200 border-2 cursor-pointer rounded-2xl {activeQuestionId ===
            q.id
                ? 'border-[#ff5623]'
                : 'border-transparent'}"
            onclick={() => toggleQuestion(q.id)}
        >
            <div class="flex justify-between items-center w-full">
                <strong>Question {q.id}</strong>

                {#if !ev || ev.status === "unanswered"}
                    <span class="py-0.5 px-2 font-semibold text-sm text-red-600 bg-red-100 rounded-2xl">Not Attempted</span>
                {:else}
                    <span
                        class="py-0.5 px-2 font-semibold text-sm rounded-2xl {ev.score_awarded === 0
                            ? 'text-red-600 bg-red-100'
                            : ev.score_awarded < q.marks
                              ? 'text-orange-500 bg-orange-100'
                              : 'text-green-600 bg-green-100'}"
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
