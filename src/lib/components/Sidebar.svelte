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
    class="fixed lg:hidden inset-0 z-40 bg-black/40 backdrop-blur-sm border-none transition-all duration-500 ease-in-out {isMobileSidebarOpen
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'}"
></button>

<aside
    class="fixed lg:relative inset-y-3 left-3 z-50 lg:inset-auto shrink-0 lg:h-full flex flex-col items-center bg-white shadow-xl rounded-2xl transition-all duration-500 ease-in-out overflow-x-hidden w-72 {isMobileSidebarOpen
        ? 'translate-x-0'
        : '-translate-x-[120%] lg:translate-x-0'} {isSidebarCollapsed
        ? 'lg:w-20'
        : 'lg:w-72'}"
>
    <div
        class="relative w-full flex items-center h-24 px-5 transition-all duration-500 ease-in-out"
    >
        <div class="flex items-center gap-3 overflow-hidden">
            <img src="veda.png" alt="VedaAI Logo" class="shrink-0 w-10 h-10" />
            <p
                class="text-2xl font-semibold whitespace-nowrap transition-all duration-500 ease-in-out max-w-[150px] opacity-100 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0'
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
            class="absolute right-5 shrink-0 cursor-pointer p-2 hover:bg-[#f0f0f0] rounded-lg transition-all duration-500 ease-in-out opacity-100 translate-x-0 {isSidebarCollapsed
                ? 'lg:opacity-0 lg:pointer-events-none lg:translate-x-4'
                : ''}"
        >
            <img src="collapse.svg" alt="Collapse" class="w-5 h-5" />
        </button>
    </div>

    <div
        class="w-full transition-all duration-500 ease-in-out pt-6 pb-10 px-6 {isSidebarCollapsed
            ? 'lg:px-4'
            : ''}"
    >
        <button
            class="h-12 w-full flex items-center justify-center bg-[rgb(61,61,61)] hover:bg-black text-white border-[3px] border-[#ea7d5b] shadow-lg transition-all duration-500 ease-in-out cursor-pointer overflow-hidden px-4 rounded-4xl {isSidebarCollapsed
                ? 'lg:px-0 lg:rounded-full'
                : ''}"
        >
            <img src="toolkit.svg" alt="" class="shrink-0 w-5 h-5" />
            <p
                class="font-medium whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-3 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                AI Teacher's Toolkit
            </p>
        </button>
    </div>

    <div
        class="w-full flex flex-col gap-2 transition-all duration-500 ease-in-out px-6 {isSidebarCollapsed
            ? 'lg:px-3'
            : ''}"
    >
        <button
            class="h-12 w-full flex items-center rounded-lg cursor-pointer hover:bg-[#f0f0f0] transition-all duration-200 px-4"
        >
            <img src="home.svg" alt="" class="shrink-0 w-6 h-6" />
            <span
                class="font-medium text-lg text-[#7e7e7e] whitespace-nowrap overflow-hidden text-left flex-1 transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-4 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                Home
            </span>
        </button>
        <button
            class="h-12 w-full flex items-center rounded-lg cursor-pointer hover:bg-[#f0f0f0] transition-all duration-200 px-4"
        >
            <img src="classroom.svg" alt="" class="shrink-0 w-6 h-6" />
            <span
                class="font-medium text-lg text-[#7e7e7e] whitespace-nowrap overflow-hidden text-left flex-1 transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-4 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                My Classroom
            </span>
        </button>
        <button
            class="h-12 w-full flex items-center rounded-lg cursor-pointer hover:bg-[#f0f0f0] transition-all duration-200 px-4"
        >
            <img src="assignments.svg" alt="" class="shrink-0 w-6 h-6" />
            <span
                class="font-medium text-lg text-[#7e7e7e] whitespace-nowrap overflow-hidden text-left flex-1 transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-4 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                Assignments
            </span>
        </button>
        <button
            class="h-12 w-full flex items-center rounded-lg cursor-pointer bg-[#f0f0f0] transition-all duration-200 px-4"
        >
            <img src="exams.svg" alt="" class="shrink-0 w-6 h-6" />
            <span
                class="font-medium text-lg text-[#303030] whitespace-nowrap overflow-hidden text-left flex-1 transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-4 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                Exams
            </span>
        </button>
        <button
            class="h-12 w-full flex items-center rounded-lg cursor-pointer hover:bg-[#f0f0f0] transition-all duration-200 px-4"
        >
            <img src="library.svg" alt="" class="shrink-0 w-6 h-6" />
            <span
                class="font-medium text-lg text-[#7e7e7e] whitespace-nowrap overflow-hidden text-left flex-1 transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-4 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                My Library
            </span>
        </button>
    </div>

    <div
        class="mt-auto w-full transition-all duration-500 ease-in-out p-6 {isSidebarCollapsed
            ? 'lg:p-3'
            : ''}"
    >
        <div
            class="flex items-center bg-[#f0f0f0] overflow-hidden transition-all duration-500 ease-in-out p-3 rounded-2xl {isSidebarCollapsed
                ? 'lg:p-2 lg:rounded-xl'
                : ''}"
        >
            <img
                src="school.png"
                alt=""
                class="shrink-0 transition-all duration-500 ease-in-out w-12 h-12 {isSidebarCollapsed
                    ? 'lg:w-10 lg:h-10'
                    : ''}"
            />
            <div
                class="flex flex-col justify-center whitespace-nowrap transition-all duration-500 ease-in-out max-w-[200px] opacity-100 ml-3 {isSidebarCollapsed
                    ? 'lg:max-w-0 lg:opacity-0 lg:ml-0'
                    : ''}"
            >
                <p class="font-semibold text-sm">Delhi Public School</p>
                <p class="text-xs text-[#7e7e7e]">Bokaro Steel City</p>
            </div>
        </div>

        <button
            onclick={() => {
                if (window.innerWidth < 1024) isMobileSidebarOpen = false;
                else isSidebarCollapsed = !isSidebarCollapsed;
            }}
            class="w-full grid place-items-center bg-[#f0f0f0] hover:bg-gray-200 transition-all duration-500 ease-in-out overflow-hidden rounded-xl h-0 opacity-0 mt-0 cursor-pointer pointer-events-none {isSidebarCollapsed
                ? 'lg:h-12 lg:opacity-100 lg:pointer-events-auto lg:mt-4'
                : ''}"
        >
            <img src="expand.svg" alt="Expand" class="w-6 h-6" />
        </button>
    </div>
</aside>
