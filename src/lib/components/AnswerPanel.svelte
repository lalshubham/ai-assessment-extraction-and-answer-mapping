<script lang="ts">
    import type { Evaluation } from "$lib/types";

    let { answerImages, evaluations, activeQuestionId } = $props<{
        answerImages: string[];
        evaluations: Evaluation[];
        activeQuestionId: string | null;
    }>();

    let scrollContainer = $state<HTMLElement | null>(null);
    let zoomLevel = $state(100);
    let currentPage = $state(1);
    let totalPages = $derived(answerImages.length);

    function changeZoom(delta: number) {
        zoomLevel = Math.max(25, Math.min(300, zoomLevel + delta));
    }

    function changePage(delta: number) {
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            document
                .getElementById(`page-${newPage}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function handleScroll() {
        if (!scrollContainer) return;
        const containerRect = scrollContainer.getBoundingClientRect();
        const viewCenter = containerRect.top + containerRect.height / 2;

        let closest = 1,
            minDiff = Infinity;

        scrollContainer
            .querySelectorAll<HTMLElement>(".answer-page")
            .forEach((page) => {
                const rect = page.getBoundingClientRect();
                const pageCenter = rect.top + rect.height / 2;
                const diff = Math.abs(pageCenter - viewCenter);

                if (diff < minDiff) {
                    minDiff = diff;
                    closest = parseInt(page.dataset.page || "1");
                }
            });

        if (currentPage !== closest) currentPage = closest;
    }
</script>

<div
    class="relative flex flex-col w-full h-full border bg-gray-100 overflow-hidden"
>
    <div
        class="flex items-center justify-between gap-4 bg-[#2d2d2d] text-white p-2 border border-gray-600/50 text-sm"
    >
        <div class="flex items-center">
            <button
                onclick={() => changeZoom(-25)}
                disabled={zoomLevel === 25}
                class="disabled:opacity-30 px-2 text-xl"
            >
                &minus;
            </button>
            <span class="w-10 text-center">{zoomLevel}%</span>
            <button
                onclick={() => changeZoom(25)}
                disabled={zoomLevel === 300}
                class="disabled:opacity-30 px-2 text-xl"
            >
                &plus;
            </button>
        </div>
        <div class="flex items-center">
            <button
                onclick={() => changePage(-1)}
                disabled={currentPage === 1}
                class="disabled:opacity-30 px-2 text-xl"
            >
                &lt;
            </button>
            <span class="text-center">Page {currentPage} of {totalPages}</span>
            <button
                onclick={() => changePage(1)}
                disabled={currentPage === totalPages}
                class="disabled:opacity-30 px-2 text-xl"
            >
                &gt;
            </button>
        </div>
    </div>

    <div
        bind:this={scrollContainer}
        onscroll={handleScroll}
        class="flex-1 overflow-auto"
    >
        <div
            class="flex flex-col gap-6 mx-auto transition-all duration-200 ease-out origin-top"
            style="width: {zoomLevel}%;"
        >
            {#each answerImages as imgUrl, index (index)}
                <div
                    id="page-{index + 1}"
                    data-page={index + 1}
                    class="answer-page relative w-full bg-white mx-auto border border-gray-200"
                >
                    <img
                        src={imgUrl}
                        alt="Page {index + 1}"
                        class="w-full block"
                    />

                    {#each evaluations as ev (ev.question_id)}
                        {#if (ev.page_index ?? 0) === index && ev.bounding_box && ev.bounding_box.length === 4 && ev.status !== "unanswered"}
                            <div
                                id="box-{ev.question_id}"
                                class="absolute border-2 transition-colors duration-200 {activeQuestionId ===
                                ev.question_id
                                    ? 'border-green-500 bg-green-500/20 z-20 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                    : 'border-blue-400/50 bg-blue-400/10 z-10 hover:bg-blue-400/20'}"
                                style="top: {ev.bounding_box[0] /
                                    10}%; left: {ev.bounding_box[1] /
                                    10}%; width: {(ev.bounding_box[3] -
                                    ev.bounding_box[1]) /
                                    10}%; height: {(ev.bounding_box[2] -
                                    ev.bounding_box[0]) /
                                    10}%;"
                            >
                                {#if activeQuestionId === ev.question_id}
                                    <span
                                        class="absolute -top-[22px] -left-[2px] bg-green-500 text-white px-2 py-0.5 text-xs"
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
    </div>
</div>
