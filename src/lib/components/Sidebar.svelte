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
    class="w-72 fixed lg:relative inset-y-3 left-3 z-50 lg:inset-auto shrink-0 lg:h-full flex flex-col items-center bg-white shadow-xl rounded-2xl transition-[transform, width] duration-500 {isMobileSidebarOpen
        ? 'translate-x-0'
        : '-translate-x-[120%] lg:translate-x-0 '} {isSidebarCollapsed
        ? 'lg:w-16'
        : 'lg:w-72'}"
>
    <div
        class="w-full flex items-center justify-between {isSidebarCollapsed
            ? 'p-3'
            : 'p-6'}"
    >
        <div class="flex items-center gap-3">
            <img src="veda.png" alt="" class="shrink-0 w-10 h-10" />
            <p
                class="text-2xl font-semibold {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                VedaAI
            </p>
        </div>
        <button
            onclick={() => {
                if (window.innerWidth < 1024) isMobileSidebarOpen = false;
                else isSidebarCollapsed = !isSidebarCollapsed;
            }}
            class="cursor-pointer"
        >
            <img
                src="collapse.svg"
                alt=""
                class={isSidebarCollapsed ? "hidden" : ""}
            />
        </button>
    </div>

    <div class="w-full {isSidebarCollapsed ? 'py-13 px-2' : 'pt-6 pb-10 px-6'}">
        <button
            class="py-3 w-full flex items-center justify-center gap-3 font-medium bg-[rgb(61,61,61)] hover:bg-black text-white border-[3px] border-[#ea7d5b] shadow-lg rounded-4xl transition-bg duration-200 cursor-pointer"
        >
            <img src="toolkit.svg" alt="" />
            <p class={isSidebarCollapsed ? "hidden" : ""}>
                AI Teacher's Toolkit
            </p>
        </button>
    </div>

    <div
        class="w-full flex flex-col gap-2 {isSidebarCollapsed
            ? 'px-2'
            : 'px-6'}"
    >
        <button
            class="py-3 w-full flex items-center gap-3 hover:bg-[#f0f0f0] rounded-lg cursor-pointer {isSidebarCollapsed
                ? 'px-2 justify-center'
                : 'px-4'}"
        >
            <img src="home.svg" alt="" />
            <p
                class="font-medium text-lg text-[#7e7e7e] {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                Home
            </p>
        </button>
        <button
            class="py-3 w-full flex items-center gap-3 hover:bg-[#f0f0f0] rounded-lg cursor-pointer {isSidebarCollapsed
                ? 'px-2 justify-center'
                : 'px-4'}"
        >
            <img src="classroom.svg" alt="" />
            <p
                class="font-medium text-lg text-[#7e7e7e] {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                My Classroom
            </p>
        </button>
        <button
            class="py-3 w-full flex items-center gap-3 hover:bg-[#f0f0f0] rounded-lg cursor-pointer {isSidebarCollapsed
                ? 'px-2 justify-center'
                : 'px-4'}"
        >
            <img src="assignments.svg" alt="" />
            <p
                class="font-medium text-lg text-[#7e7e7e] {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                Assignments
            </p>
        </button>
        <button
            class="py-3 w-full flex items-center gap-3 bg-[#f0f0f0] rounded-lg cursor-pointer {isSidebarCollapsed
                ? 'px-2 justify-center'
                : 'px-4'}"
        >
            <img src="exams.svg" alt="" />
            <p
                class="font-medium text-lg text-[#303030] {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                Exams
            </p>
        </button>
        <button
            class="py-3 w-full flex items-center gap-3 hover:bg-[#f0f0f0] rounded-lg cursor-pointer {isSidebarCollapsed
                ? 'px-2 justify-center'
                : 'px-4'}"
        >
            <img src="library.svg" alt="" />
            <p
                class="font-medium text-lg text-[#7e7e7e] {isSidebarCollapsed
                    ? 'hidden'
                    : ''}"
            >
                My Library
            </p>
        </button>
    </div>

    <div class="mt-auto w-full {isSidebarCollapsed ? 'p-3' : 'p-6'}">
        <div
            class="flex items-center gap-2 bg-[#f0f0f0] {isSidebarCollapsed
                ? 'p-1 rounded-lg'
                : 'p-3 rounded-2xl'}"
        >
            <img src="school.png" alt="" class="w-12" />
            <div class={isSidebarCollapsed ? "hidden" : ""}>
                <p class="font-semibold">Delhi Public School</p>
                <p class="text-sm text-[#7e7e7e]">Bokaro Steel City</p>
            </div>
        </div>

        {#if isSidebarCollapsed}
            <button
                onclick={() => {
                    if (window.innerWidth < 1024) isMobileSidebarOpen = false;
                    else isSidebarCollapsed = !isSidebarCollapsed;
                }}
                class="mt-3 w-full h-10 grid place-items-center hover:bg-[#f0f0f0] rounded-lg"
            >
                <img src="expand.svg" alt="" class="w-6" />
            </button>
        {/if}
    </div>
</aside>
