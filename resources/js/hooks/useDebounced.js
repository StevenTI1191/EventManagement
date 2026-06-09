import { useRef, useEffect } from 'react';

/**
 * Returns a debounced version of the given function.
 * Useful for search inputs to avoid firing a request on every keystroke.
 *
 * @param {Function} fn     - The function to debounce
 * @param {number}   delay  - Delay in milliseconds (default 400ms)
 *
 * @example
 * const debouncedSearch = useDebounced((val) => {
 *     router.get(route('...'), { search: val }, { preserveState: true, replace: true });
 * });
 *
 * // In JSX:
 * onChange={e => { setSearch(e.target.value); debouncedSearch(e.target.value); }}
 */
export function useDebounced(fn, delay = 400) {
    const timer = useRef(null);
    // Cleanup timer saat komponen unmount — cegah callback jalan setelah unmount
    useEffect(() => () => clearTimeout(timer.current), []);
    return (...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    };
}
