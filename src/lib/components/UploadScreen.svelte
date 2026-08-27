<script lang="ts">
    let { questionFile, answerFile, onFileUpload, onStart } = $props<{
        questionFile: File | null;
        answerFile: File | null;
        onFileUpload: (e: Event, type: "question" | "answer") => void;
        onStart: () => void;
    }>();
</script>

<div class="flex flex-col items-center justify-center flex-1">
    <div
        class="flex flex-col gap-6 border p-8 shadow-sm bg-white rounded max-w-md w-full"
    >
        <h1 class="text-xl font-bold text-center">AI Assessment Mapper</h1>

        <label
            class="flex flex-col border p-3 cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
            <strong>1. Upload Question Paper</strong>
            <input
                type="file"
                accept=".pdf,image/*"
                onchange={(e) => onFileUpload(e, "question")}
                class="mt-2"
            />
        </label>

        <label
            class="flex flex-col border p-3 cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
            <strong>2. Upload Answer Sheet</strong>
            <input
                type="file"
                accept=".pdf,image/*"
                onchange={(e) => onFileUpload(e, "answer")}
                class="mt-2"
            />
        </label>

        <button
            disabled={!questionFile || !answerFile}
            onclick={onStart}
            class="p-3 mt-2 border bg-black text-white font-bold cursor-pointer disabled:opacity-50"
        >
            Start Mapping
        </button>
    </div>
</div>
