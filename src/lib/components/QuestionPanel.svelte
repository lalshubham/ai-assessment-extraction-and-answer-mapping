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
        <div class="bg-gray-100 p-2 flex flex-col gap-1 border-b mb-2 rounded">
            <div class="text-sm text-gray-700 font-bold text-center">
                {examMeta.grade_level || "Unknown Class"} - {examMeta.subject ||
                    "Unknown Subject"}
            </div>
            {#if evaluations.length > 0}
                <div
                    class="text-lg text-black font-extrabold text-center bg-green-200 py-1 rounded shadow-sm"
                >
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
            class="flex flex-col gap-2 p-3 border rounded cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-black w-full transition-colors duration-200 {activeQuestionId ===
            q.id
                ? 'bg-gray-50 border-black shadow-sm'
                : 'bg-transparent border-gray-200 hover:bg-gray-50'}"
            onclick={() => toggleQuestion(q.id)}
        >
            <div class="flex justify-between items-center w-full">
                <strong class="text-lg">{q.id}</strong>
                {#if ev}
                    {#if ev.status === "unanswered"}
                        <span
                            class="text-red-600 border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-bold rounded"
                        >
                            Not Attempted
                        </span>
                    {:else}
                        <span
                            class="font-bold text-sm {ev.score_awarded ===
                            q.marks
                                ? 'text-green-600'
                                : 'text-orange-500'}"
                        >
                            {ev.score_string}
                        </span>
                    {/if}
                {/if}
            </div>
            <p class="text-sm text-gray-800 leading-relaxed">{q.text}</p>
            {#if q.options && q.options.length > 0}
                <div
                    class="text-xs text-gray-600 pl-3 border-l-2 border-gray-300"
                >
                    {#each q.options as opt (opt)}
                        <div class="py-0.5">{opt}</div>
                    {/each}
                </div>
            {/if}
            <span class="text-xs text-gray-400 font-semibold mt-1">
                Max Marks: {q.marks || "?"}
            </span>
            {#if activeQuestionId === q.id && ev?.feedback}
                <div
                    class="p-2 border rounded mt-2 bg-orange-50 border-orange-300 text-sm text-orange-900 w-full shadow-inner"
                >
                    <strong class="text-orange-800">Feedback:</strong>
                    {ev.feedback}
                </div>
            {/if}
        </button>
    {/each}
</div>
