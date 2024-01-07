const Navbar = () => {

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || 'megaman';

    const models = [
        "Megaman",
        "Roll",
        "Tron",
        "Apron",
        "Matilda",
        "Glide",
        "Geetz"
    ]

    return (
        <header class='sticky top-0'>
            <nav class="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
                <div class="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
                    <a href="/" class="flex items-center">
                        <img src="/mml2-logo.svg" class="mr-3 h-6 sm:h-9" alt="MML2 DashGL Placeholder Logo" />
                        <span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Player Viewer</span>
                    </a>
                    <div class="flex items-center lg:order-2">
                        <a href="#" class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800">Fork Me</a>
                        <a href="#" class="text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800">Custom</a>
                    </div>
                    <div class="hidden justify-between items-center w-full lg:flex lg:w-auto lg:order-1" id="mobile-menu-2">
                        <ul class="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0">

                            {
                                models.map((name) => {
                                    const check = name.toLocaleLowerCase();
                                    const href = `/player?slug=${check}`;
                                    const activeClass = 'block py-2 pr-4 pl-3 text-white rounded bg-primary-700 lg:bg-transparent lg:text-primary-700 lg:p-0 dark:text-white';
                                    const notActiveClass = 'block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700';
                                    const classes = check === slug ? activeClass : notActiveClass;
                                    return (
                                        <li>
                                            <a href={href} class={classes}>{name}</a>
                                        </li>
                                    )
                                })
                            }
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    )
}

export default Navbar;