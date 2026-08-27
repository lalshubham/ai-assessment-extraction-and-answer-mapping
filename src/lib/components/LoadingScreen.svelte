<script lang="ts">
    let { progressStatus } = $props<{ progressStatus: string | null }>();
</script>

<div class="flex flex-col items-center justify-center flex-1">
    <div
        class="flex flex-col items-center gap-4 border p-12 shadow-sm bg-white rounded"
    >
        <div
            class="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"
        ></div>
        <h2 class="text-xl font-bold">Processing</h2>
        <p class="text-gray-600">{progressStatus}</p>
    </div>
</div>
