<script lang="ts">
    let { progressStatus } = $props<{ progressStatus: string | null }>();
</script>

<div class="m-auto w-fit flex flex-col items-center gap-2">
    <h2 class="text-xl">Processing</h2>
    <p class="text-gray-600">{progressStatus}</p>
</div>
