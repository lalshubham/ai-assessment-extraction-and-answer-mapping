<script lang="ts">
    import { SvelteSet } from "svelte/reactivity";
    import type { Exam, Assessment } from "$lib/types";

    interface Props {
        exam: Exam;
        assessment: Assessment | null;
        activeQuestionId: string | null;
    }

    let { exam, assessment, activeQuestionId = $bindable() }: Props = $props();

    let expanded = new SvelteSet<string>();
    let anyExpanded = $derived(expanded.size > 0);

    function toggleExpandAll() {
        if (anyExpanded) {
            expanded.clear();
        } else {
            exam.questions.forEach((q) => {
                const ev = assessment?.evaluations?.find(
                    (e) => e.question_id === q.id,
                );
                const isAttempted = ev && ev.status !== "unanswered";

                if (isAttempted && ev?.feedback) {
                    expanded.add(q.id);
                }
            });
        }
    }

    function toggleQuestion(id: string) {
        const ev = assessment?.evaluations?.find((e) => e.question_id === id);
        const isAttempted = ev && ev.status !== "unanswered";

        if (!isAttempted) return;

        const hasFeedback = !!ev?.feedback;

        if (activeQuestionId === id) {
            activeQuestionId = null;
            expanded.delete(id);
        } else {
            activeQuestionId = id;

            if (hasFeedback) {
                expanded.add(id);
            }
        }
    }
</script>

<div
    class="h-full p-4 md:p-6 flex flex-col gap-4 bg-[#f0f0f0] rounded-2xl overflow-y-auto"
>
    <div class="flex items-center justify-between">
        <h2 class="font-medium text-lg text-[#2b2b2b]">Extracted Questions</h2>
        <button
            type="button"
            class="px-4 py-1.5 w-[125px] bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
            onclick={toggleExpandAll}
        >
            {anyExpanded ? "Collapse All" : "Expand All"}
        </button>
    </div>

    {#each exam.questions as q (q.id)}
        {@const ev = assessment?.evaluations?.find(
            (e) => e.question_id === q.id,
        )}

        {@const isAttempted = ev && ev.status !== "unanswered"}

        {@const isExpanded = expanded.has(q.id)}
        {@const isActive = activeQuestionId === q.id}

        {@const idMatch = q.id.trim().match(/^(\d+)(.*)$/)}
        {@const mainId = idMatch ? idMatch[1] : q.id.trim()}
        {@const rawSubId = idMatch ? idMatch[2] : ""}
        {@const subId = rawSubId.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")}

        <button
            type="button"
            aria-expanded={isExpanded}
            class="p-4 flex flex-col gap-3 text-left w-full bg-white duration-200 border-2 rounded-2xl shadow-sm transition-all {isAttempted
                ? 'cursor-pointer hover:shadow-md'
                : 'cursor-default'} {isActive
                ? 'border-[#ff5623]'
                : 'border-transparent'}"
            onclick={() => toggleQuestion(q.id)}
        >
            <div
                class="flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3 gap-x-4 w-full"
            >
                <div class="flex items-center gap-2 shrink-0">
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border-[2px] border-[rgba(255,255,255,0.3)] transition-colors duration-200 {isActive
                            ? 'bg-[#ff5623]'
                            : 'bg-[rgb(61,61,61)]'}"
                    >
                        {mainId}
                    </div>

                    {#if subId}
                        <div
                            class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-800 bg-[#f5f5f5] text-sm"
                        >
                            {subId}.
                        </div>
                    {/if}
                </div>

                <div class="w-full hidden xl:block text-gray-800 font-medium">
                    {q.text}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    {#if !isAttempted}
                        <span
                            class="py-1 px-3 font-bold text-xs text-red-600 bg-red-100 rounded-full"
                        >
                            Not Attempted
                        </span>
                    {:else}
                        <span
                            class="py-1 px-3 font-bold text-sm rounded-full {ev.score_awarded ===
                            0
                                ? 'text-red-600 bg-red-100'
                                : ev.score_awarded < q.marks
                                  ? 'text-orange-600 bg-orange-100'
                                  : 'text-green-700 bg-green-100'}"
                        >
                            {ev.score_string}
                        </span>
                    {/if}

                    {#if ev?.feedback && isAttempted}
                        <div
                            class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f5f5f5] text-gray-600"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                class="transition-transform duration-300 {isExpanded
                                    ? 'rotate-0'
                                    : 'rotate-180'}"
                            >
                                <path
                                    d="M3.5 5.25L7 8.75L10.5 5.25"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>
                    {/if}
                </div>
            </div>
            <div class="w-full xl:hidden text-gray-800 font-medium">
                {q.text}
            </div>

            {#if q.options && q.options.length > 0}
                <div class="text-sm text-gray-600 flex flex-col gap-1">
                    {#each q.options as opt (opt)}
                        <div>{opt}</div>
                    {/each}
                </div>
            {/if}

            {#if isExpanded && ev?.feedback}
                <div class="p-4 rounded-xl bg-[#f8f9fa]">
                    <p class="font-bold text-[13px] text-gray-800 mb-1.5">
                        AI Feedback
                    </p>
                    <p class="text-[14px] text-gray-700 leading-relaxed">
                        {ev.feedback}
                    </p>
                </div>
            {/if}
        </button>
    {/each}
</div>
