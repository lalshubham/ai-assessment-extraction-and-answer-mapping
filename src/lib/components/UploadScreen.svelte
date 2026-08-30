<script lang="ts">
    import { getPdfPageCount } from "$lib/utils/file";

    let {
        questionFiles = $bindable([]),
        answerFiles = $bindable([]),
        onStart,
    } = $props<{
        questionFiles: File[];
        answerFiles: File[];
        onStart: () => void;
    }>();

    type FileMeta = {
        id: string;
        file: File;
        size: string;
        type: "PDF" | "IMG";
        pages?: number;
    };

    let qMeta = $state<FileMeta[]>([]);
    let aMeta = $state<FileMeta[]>([]);

    let qDrag = $state(false);
    let aDrag = $state(false);

    const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    function formatSize(bytes: number) {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
        return (bytes / (1024 * 1024)).toFixed(1) + "MB";
    }

    async function processFiles(newFiles: File[], type: "question" | "answer") {
        const currentFiles = type === "question" ? questionFiles : answerFiles;
        let totalSize = currentFiles.reduce(
            (sum: number, f: File) => sum + f.size,
            0,
        );

        for (const file of newFiles) {
            if (
                file.type !== "application/pdf" &&
                !file.type.startsWith("image/")
            )
                continue;

            if (totalSize + file.size > MAX_SIZE_BYTES) {
                alert(`Adding "${file.name}" exceeds the 10MB section limit.`);
                continue;
            }

            totalSize += file.size;

            let pages = undefined;
            if (file.type === "application/pdf") {
                try {
                    pages = await getPdfPageCount(file);
                } catch (e) {
                    console.error("Failed to read PDF pages", e);
                }
            }

            const meta: FileMeta = {
                id: Math.random().toString(36).substring(2, 9),
                file,
                size: formatSize(file.size),
                type: file.type === "application/pdf" ? "PDF" : "IMG",
                pages,
            };

            if (type === "question") {
                questionFiles = [...questionFiles, file];
                qMeta = [...qMeta, meta];
            } else {
                answerFiles = [...answerFiles, file];
                aMeta = [...aMeta, meta];
            }
        }
    }

    function removeFile(id: string, type: "question" | "answer") {
        if (type === "question") {
            const idx = qMeta.findIndex((m) => m.id === id);
            if (idx > -1) {
                qMeta.splice(idx, 1);
                questionFiles.splice(idx, 1);
            }
        } else {
            const idx = aMeta.findIndex((m) => m.id === id);
            if (idx > -1) {
                aMeta.splice(idx, 1);
                answerFiles.splice(idx, 1);
            }
        }
    }

    function handleDrop(e: DragEvent, type: "question" | "answer") {
        e.preventDefault();
        if (type === "question") qDrag = false;
        else aDrag = false;

        if (e.dataTransfer?.files) {
            processFiles(Array.from(e.dataTransfer.files), type);
        }
    }
</script>

<div class="pt-6 pb-10 w-full flex-1 flex flex-col items-center gap-5">
    <div class="max-w-[340px] sm:max-w-none flex flex-col items-center">
        <p
            class="mb-4 font-bold sm:font-semibold text-[23px] sm:text-3xl md:text-4xl leading-7.5 sm:leading-none text-[#2b2b2b] text-center"
        >
            <span>Upload</span>
            <span class="sm:px-2 sm:bg-[#ecdeca] sm:text-[#ff5500] rounded-md">
                Question Paper & Answer Sheets
            </span>
        </p>
        <p class="mb-4 hidden sm:block text-xl text-[#303030]">
            Upload both files to get started
        </p>
        <div class="a">
            <div class="b">
                <div class="c"></div>
                <div class="d"></div>
                <div class="e">
                    <div class="f"></div>
                    <div class="g"></div>
                    <div class="h">
                        <div class="i">
                            <img src="teacher.png" alt="" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="j">
                <div class="k">
                    <svg viewBox="0 0 24 24">
                        <path
                            fill="#fff"
                            d="M15.098 12.634 13 11.423V7a1 1 0 0 0-2 0v5a1 1 0 0 0 .5.866l2.598 1.5a1 1 0 1 0 1-1.732M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2m0 18a8 8 0 1 1 8-8 8.01 8.01 0 0 1-8 8"
                        />
                    </svg>
                </div>
                <div class="k">
                    <svg viewBox="0 0 24 24">
                        <path
                            fill="#fff"
                            d="M19.9 12.66a1 1 0 0 1 0-1.32l1.28-1.44a1 1 0 0 0 .12-1.17l-2-3.46a1 1 0 0 0-1.07-.48l-1.88.38a1 1 0 0 1-1.15-.66l-.61-1.83a1 1 0 0 0-.95-.68h-4a1 1 0 0 0-1 .68l-.56 1.83a1 1 0 0 1-1.15.66L5 4.79a1 1 0 0 0-1 .48L2 8.73a1 1 0 0 0 .1 1.17l1.27 1.44a1 1 0 0 1 0 1.32L2.1 14.1a1 1 0 0 0-.1 1.17l2 3.46a1 1 0 0 0 1.07.48l1.88-.38a1 1 0 0 1 1.15.66l.61 1.83a1 1 0 0 0 1 .68h4a1 1 0 0 0 .95-.68l.61-1.83a1 1 0 0 1 1.15-.66l1.88.38a1 1 0 0 0 1.07-.48l2-3.46a1 1 0 0 0-.12-1.17ZM18.41 14l.8.9-1.28 2.22-1.18-.24a3 3 0 0 0-3.45 2L12.92 20h-2.56L10 18.86a3 3 0 0 0-3.45-2l-1.18.24-1.3-2.21.8-.9a3 3 0 0 0 0-4l-.8-.9 1.28-2.2 1.18.24a3 3 0 0 0 3.45-2L10.36 4h2.56l.38 1.14a3 3 0 0 0 3.45 2l1.18-.24 1.28 2.22-.8.9a3 3 0 0 0 0 3.98m-6.77-6a4 4 0 1 0 4 4 4 4 0 0 0-4-4m0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2"
                        />
                    </svg>
                </div>
                <div class="k">
                    <svg viewBox="0 0 24 24">
                        <path
                            style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2"
                            d="m7 9 1 1 2-2"
                        />
                        <path
                            data-name="secondary"
                            style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2"
                            d="m7 15 1 1 2-2m7-5h-3m3 6h-3"
                        />
                        <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="1"
                            style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2"
                        />
                    </svg>
                </div>
                <div class="k">
                    <svg
                        viewBox="0 0 24 24"
                        stroke="#fff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        fill="none"
                        color="#fff"
                    >
                        <path d="m13 15 1 3h-2l1 3" />
                        <path
                            d="M19.051 17.957C20.5 17.97 22 16.245 22 14.5a3.5 3.5 0 0 0-3.079-3.475 6.002 6.002 0 0 0-11.21-1.86A4.504 4.504 0 0 0 2 13.5c0 2.311 1.5 4.47 3.986 4.47H7"
                        />
                    </svg>
                </div>
            </div>
        </div>
    </div>

    <div
        class="max-w-3xl w-full sm:min-h-[210px] flex flex-col sm:flex-row gap-4 bg-[#f0f0f0] p-4 rounded-3xl"
    >
        <div
            role="region"
            aria-label="Upload Question Paper Dropzone"
            class="p-6 relative flex-1 flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-colors duration-200 {qDrag
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-300 bg-white'}"
            ondragover={(e) => {
                e.preventDefault();
                qDrag = true;
            }}
            ondragleave={() => (qDrag = false)}
            ondrop={(e) => handleDrop(e, "question")}
        >
            <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onchange={(e) =>
                    processFiles(
                        Array.from(e.currentTarget.files || []),
                        "question",
                    )}
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                title=""
            />

            {#if qMeta.length === 0}
                <div class="flex flex-col items-center pointer-events-none">
                    <div class="bg-gray-100 p-2 rounded-lg mb-3">
                        <svg
                            class="w-5 h-5 text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2.5"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            ></path>
                        </svg>
                    </div>
                    <div class="text-lg text-[#303030] font-semibold">
                        Upload
                        <span class="text-[#ff5623]">Question Paper </span>
                    </div>
                    <div class="text-gray-400 text-sm mt-1">Max 10MB</div>
                </div>
            {:else}
                <div class="flex flex-col gap-3 w-full relative z-30">
                    {#each qMeta as meta (meta.id)}
                        <div
                            class="flex items-center gap-4 bg-[#f6f6f6] border border-gray-100 rounded-xl p-3 relative"
                        >
                            <div
                                class="flex-shrink-0 w-9 h-9 rounded text-white font-bold text-[10px] flex items-center justify-center {meta.type ===
                                'PDF'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'}"
                            >
                                {meta.type}
                            </div>
                            <div class="flex flex-col overflow-hidden pr-4">
                                <span
                                    class="text-sm font-semibold text-gray-800 truncate"
                                >
                                    {meta.file.name}
                                </span>
                                <span
                                    class="text-xs text-gray-500 font-medium mt-0.5"
                                >
                                    {meta.size} &bull; {meta.pages
                                        ? `${meta.pages} Pages`
                                        : "1 Page"}
                                </span>
                            </div>
                            <button
                                type="button"
                                onclick={() => removeFile(meta.id, "question")}
                                class="absolute -top-2 -right-2 z-40 w-6 h-6 flex items-center justify-center font-light text-2xl bg-[#555555] hover:bg-black text-white rounded-full shadow-sm transition-colors cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div
            role="region"
            aria-label="Upload Answer Sheet Dropzone"
            class="p-6 relative flex-1 flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-colors duration-200 {aDrag
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-300 bg-white'}"
            ondragover={(e) => {
                e.preventDefault();
                aDrag = true;
            }}
            ondragleave={() => (aDrag = false)}
            ondrop={(e) => handleDrop(e, "answer")}
        >
            <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onchange={(e) =>
                    processFiles(
                        Array.from(e.currentTarget.files || []),
                        "answer",
                    )}
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                title=""
            />

            {#if aMeta.length === 0}
                <div class="flex flex-col items-center pointer-events-none">
                    <div class="bg-gray-100 p-2 rounded-lg mb-3">
                        <svg
                            class="w-5 h-5 text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2.5"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            ></path>
                        </svg>
                    </div>
                    <div class="text-lg text-[#303030] font-semibold">
                        Upload
                        <span class="text-[#ff5623]">Answer Sheet</span>
                    </div>
                    <div class="text-gray-400 text-sm mt-1">Max 10MB</div>
                </div>
            {:else}
                <div class="flex flex-col gap-3 w-full relative z-30">
                    {#each aMeta as meta (meta.id)}
                        <div
                            class="flex items-center gap-4 bg-[#f6f6f6] border border-gray-100 rounded-xl p-3 relative"
                        >
                            <div
                                class="flex-shrink-0 w-9 h-9 rounded text-white font-bold text-[10px] flex items-center justify-center {meta.type ===
                                'PDF'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'}"
                            >
                                {meta.type}
                            </div>
                            <div class="flex flex-col overflow-hidden pr-4">
                                <span
                                    class="text-sm font-semibold text-gray-800 truncate"
                                >
                                    {meta.file.name}
                                </span>
                                <span
                                    class="text-xs text-gray-500 font-medium mt-0.5"
                                >
                                    {meta.size} &bull; {meta.pages
                                        ? `${meta.pages} Pages`
                                        : "1 Page"}
                                </span>
                            </div>
                            <button
                                type="button"
                                onclick={() => removeFile(meta.id, "answer")}
                                class="absolute -top-2 -right-2 z-40 w-6 h-6 flex items-center justify-center font-light text-2xl bg-[#555555] hover:bg-black text-white rounded-full shadow-sm transition-colors cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <button
        disabled={questionFiles.length === 0 || answerFiles.length === 0}
        onclick={onStart}
        class="mt-2 py-3 px-6 flex items-center gap-3 font-medium bg-[rgb(61,61,61)] hover:bg-black disabled:bg-[#b2b2b2] text-white border-[3px] border-[rgba(255,255,255,0.3)] rounded-4xl cursor-pointer disabled:cursor-not-allowed"
    >
        Start Mapping
        <svg
            class="w-4.5"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            ><path
                fill="#fff"
                d="M8.293 2.293a1 1 0 0 1 1.414 0l4.5 4.5a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414-1.414L11 8.5H1.5a1 1 0 0 1 0-2H11L8.293 3.707a1 1 0 0 1 0-1.414"
            /></svg
        >
    </button>

    <p class="text-sm text-[#777777] text-center">
        Once both files are uploaded, you'll be able to map answers with
        questions
    </p>
</div>
