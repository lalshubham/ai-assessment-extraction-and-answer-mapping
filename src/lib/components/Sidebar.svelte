<script lang="ts">
    interface Props {
        isMobileSidebarOpen: boolean;
        isSidebarCollapsed: boolean;
    }

    let {
        isMobileSidebarOpen = $bindable(),
        isSidebarCollapsed = $bindable(),
    }: Props = $props();
</script>

<button
    onclick={() => (isMobileSidebarOpen = false)}
    tabindex={isSidebarCollapsed ? 0 : -1}
    aria-label="Background blur"
    class="fixed lg:hidden inset-0 z-40 bg-black/40 backdrop-blur-xs border-none transition-opacity duration-500 {isMobileSidebarOpen
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'}"
></button>

<aside
    class="fixed lg:relative inset-y-3 left-3 z-50 lg:inset-auto shrink-0 w-64 lg:h-full bg-white shadow-xl rounded-2xl transition-[transform, width] duration-500 {isMobileSidebarOpen
        ? 'translate-x-0'
        : '-translate-x-[120%] lg:translate-x-0 '} {isSidebarCollapsed
        ? 'lg:w-16'
        : 'lg:w-72'}"
>
    <button
        onclick={() => {
            if (window.innerWidth < 1024) isMobileSidebarOpen = false;
            else isSidebarCollapsed = !isSidebarCollapsed;
        }}
    >
        <span class="lg:hidden">Close</span>
        <span class="hidden lg:inline">
            {isSidebarCollapsed ? "Expand" : "Close"}
        </span>
    </button>
</aside>
