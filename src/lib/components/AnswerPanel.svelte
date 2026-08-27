<script lang="ts">
    type Evaluation = {
        question_id: string;
        status: "answered" | "unanswered";
        score_awarded?: number;
        score_string?: string;
        feedback?: string;
        page_index?: number;
        bounding_box?: [number, number, number, number];
    };

    let { answerImages, evaluations, activeQuestionId } = $props<{
        answerImages: string[];
        evaluations: Evaluation[];
        activeQuestionId: string | null;
    }>();
</script>

<div class="flex flex-col gap-4 w-2/3 overflow-y-auto border p-4 bg-[#f9fafb]">
    {#each answerImages as imgUrl, index (index)}
        <div class="relative border w-full bg-white">
            <img src={imgUrl} alt="Page {index + 1}" class="w-full block" />
            {#each evaluations as ev (ev.question_id)}
                {#if (ev.page_index ?? 0) === index && ev.bounding_box && ev.bounding_box.length === 4 && ev.status !== "unanswered"}
                    <div
                        class="absolute border-2"
                        style="
                            border-color: {activeQuestionId === ev.question_id
                            ? '#22c55e'
                            : 'rgba(96, 165, 250, 0.5)'};
                            background-color: {activeQuestionId ===
                        ev.question_id
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(96, 165, 250, 0.1)'};
                            z-index: {activeQuestionId === ev.question_id
                            ? 20
                            : 10};
                            top: {ev.bounding_box[0] / 10}%; 
                            left: {ev.bounding_box[1] / 10}%; 
                            width: {(ev.bounding_box[3] - ev.bounding_box[1]) /
                            10}%; 
                            height: {(ev.bounding_box[2] - ev.bounding_box[0]) /
                            10}%;
                        "
                    >
                        {#if activeQuestionId === ev.question_id}
                            <span
                                class="absolute shadow"
                                style="top: -24px; left: -2px; background: #22c55e; color: white; padding: 2px 4px; font-size: 12px; font-weight: bold;"
                            >
                                Q{ev.question_id}
                            </span>
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    {/each}
</div>
