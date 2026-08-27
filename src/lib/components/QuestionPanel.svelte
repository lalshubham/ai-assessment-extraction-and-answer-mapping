<script lang="ts">
    type Question = {
        id: string;
        text: string;
        marks?: number;
        options?: string[];
    };

    type Evaluation = {
        question_id: string;
        status: "answered" | "unanswered";
        score_awarded?: number;
        score_string?: string;
        feedback?: string;
        page_index?: number;
        bounding_box?: [number, number, number, number];
    };

    type MetaData = {
        grade_level?: string;
        subject?: string;
    };

    let {
        examMeta,
        questions,
        evaluations,
        activeQuestionId = $bindable(),
        totalScore,
        totalMaxMarks,
    } = $props<{
        examMeta: MetaData | null;
        questions: Question[];
        evaluations: Evaluation[];
        activeQuestionId: string | null;
        totalScore: number;
        totalMaxMarks: number;
    }>();

    function toggleQuestion(id: string) {
        activeQuestionId = activeQuestionId === id ? null : id;
    }
</script>

<div class="flex flex-col gap-2 w-1/3 overflow-y-auto border p-2">
    {#if examMeta}
        <div class="bg-gray-100 p-2 flex flex-col gap-1 border-b mb-2">
            <div class="text-sm text-gray-700 font-bold text-center">
                {examMeta.grade_level || "Unknown Class"} - {examMeta.subject ||
                    "Unknown Subject"}
            </div>
            {#if evaluations.length > 0}
                <div
                    class="text-lg text-black font-extrabold text-center bg-green-200 py-1 rounded"
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

        <div
            role="button"
            tabindex="0"
            class="flex flex-col gap-2 p-2 border cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-black"
            style="background-color: {activeQuestionId === q.id
                ? '#f3f4f6'
                : 'transparent'}; border-color: {activeQuestionId === q.id
                ? 'black'
                : '#e5e7eb'};"
            onclick={() => toggleQuestion(q.id)}
            onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleQuestion(q.id);
                }
            }}
        >
            <div class="flex justify-between items-center">
                <strong>{q.id}</strong>
                {#if ev}
                    {#if ev.status === "unanswered"}
                        <span
                            style="color: red; border: 1px solid red; padding: 2px; font-size: 12px;"
                        >
                            Not Attempted
                        </span>
                    {:else}
                        <span
                            style="color: {ev.score_awarded === q.marks
                                ? 'green'
                                : 'orange'}; font-weight: bold;"
                        >
                            {ev.score_string}
                        </span>
                    {/if}
                {/if}
            </div>
            <p>{q.text}</p>
            {#if q.options && q.options.length > 0}
                <div class="text-xs text-gray-500 pl-2 border-l-2">
                    {#each q.options as opt (opt)}
                        <div>{opt}</div>
                    {/each}
                </div>
            {/if}
            <span class="text-xs text-gray-500">
                Max Marks: {q.marks || "?"}
            </span>
            {#if activeQuestionId === q.id && ev?.feedback}
                <div
                    class="p-2 border mt-1"
                    style="background-color: #fff7ed; border-color: #fdba74; font-size: 14px;"
                >
                    <strong>Feedback:</strong>
                    {ev.feedback}
                </div>
            {/if}
        </div>
    {/each}
</div>
