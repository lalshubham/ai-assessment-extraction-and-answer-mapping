<script lang="ts">
    import type { ScreenStage } from "$lib/types";

    interface Props {
        currentScreen: ScreenStage;
        isMobileSidebarOpen: boolean;
    }

    let { currentScreen, isMobileSidebarOpen = $bindable() }: Props = $props();
</script>

<header
    class="px-4 shrink-0 h-16 flex items-center justify-between rounded-2xl {currentScreen !==
    'upload'
        ? 'bg-[#f6f6f6]'
        : 'bg-white'}"
>
    <div class="flex items-center gap-2 lg:gap-5">
        <button title="Back" class="cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                    d="M21 11H5.41l5.3-5.29a1 1 0 1 0-1.42-1.42l-7 7a1 1 0 0 0 0 1.42l7 7a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42L5.41 13H21a1 1 0 0 0 0-2"
                    style="fill:#000"
                />
            </svg>
        </button>
        <div
            class="hidden lg:flex items-center gap-2 font-semibold text-lg text-[#a9a9a9]"
        >
            <img src="clipboard.svg" alt="" />
            Exams
        </div>
        <p class="lg:hidden font-bold text-[22px] text-[#303030]">VedaAI</p>
    </div>
    <div class="flex items-center gap-4">
        <button
            class="w-8 h-8 hidden sm:grid place-items-center bg-[#f6f6f6] rounded-full cursor-pointer"
            title="FAQ"
        >
            <img src="faq.svg" alt="" class="w-5 h-5" />
        </button>
        <button
            class="relative w-8 h-8 grid place-items-center bg-[#f6f6f6] rounded-full cursor-pointer"
            title="Notification"
        >
            <span
                class="absolute top-0 right-0 w-2 h-2 bg-[#ff5623] rounded-full"
            ></span>
            <img src="notification.svg" alt="" class="w-5 h-5" />
        </button>
        <button
            class="w-8 h-8 hidden sm:grid place-items-center rounded-full cursor-pointer {currentScreen !==
            'upload'
                ? 'bg-white'
                : ''}"
        >
            <img src="sparkle.svg" alt="" />
        </button>
        <button class="flex items-center gap-2 cursor-pointer">
            <img src="avatar.png" alt="" class="w-8 h-8" />
            <p class="hidden sm:block text-lg font-medium">Madhur Rastogi</p>
            <svg
                class="hidden sm:block"
                width="20"
                viewBox="0 -6 524 524"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="m64 191 34-34 164 163 164-163 34 34-198 196z" />
            </svg>
        </button>
        <button
            onclick={() => (isMobileSidebarOpen = !isMobileSidebarOpen)}
            class="lg:hidden cursor-pointer"
            title="Menu"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                    d="M3 18V16H21V18H3ZM3 13V11H21V13H3ZM3 8V6H21V8H3Z"
                    fill="#1d1b20"
                />
            </svg>
        </button>
    </div>
</header>
