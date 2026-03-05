export type SortState = {
  array: number[];
  active: number[];
};

export const ALGORITHMS = [
  'Bubble Sort',
  'Quick Sort',
  'Merge Sort',
  'Insertion Sort',
  'Selection Sort',
  'Cocktail Sort',
  'Heap Sort',
  'Shell Sort',
  'Gnome Sort',
  'Comb Sort',
  'Counting Sort',
  'Radix Sort',
  'Odd-Even Sort',
  'Pancake Sort',
  'Cycle Sort',
  'Tim Sort',
  'Bitonic Sort',
  'Stooge Sort',
] as const;

export type AlgorithmName = typeof ALGORITHMS[number];

export function* bubbleSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      yield { array: [...a], active: [j, j + 1] };
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield { array: [...a], active: [j, j + 1] };
      }
    }
  }
  yield { array: [...a], active: [] };
}

export function* cocktailSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  let swapped = true;
  let start = 0;
  let end = a.length - 1;

  while (swapped) {
    swapped = false;
    for (let i = start; i < end; ++i) {
      yield { array: [...a], active: [i, i + 1] };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
        yield { array: [...a], active: [i, i + 1] };
      }
    }

    if (!swapped) break;

    swapped = false;
    --end;

    for (let i = end - 1; i >= start; --i) {
      yield { array: [...a], active: [i, i + 1] };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
        yield { array: [...a], active: [i, i + 1] };
      }
    }
    ++start;
  }
  yield { array: [...a], active: [] };
}

export function* heapSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;

  function* heapify(n: number, i: number): Generator<SortState> {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;

    const currentActive = [i];
    if (l < n) currentActive.push(l);
    if (r < n) currentActive.push(r);
    yield { array: [...a], active: currentActive };

    if (l < n && a[l] > a[largest]) largest = l;
    if (r < n && a[r] > a[largest]) largest = r;

    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      yield { array: [...a], active: [i, largest] };
      yield* heapify(n, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    yield { array: [...a], active: [0, i] };
    yield* heapify(i, 0);
  }
  yield { array: [...a], active: [] };
}

export function* shellSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      const temp = a[i];
      let j;
      for (j = i; j >= gap && a[j - gap] > temp; j -= gap) {
        yield { array: [...a], active: [j, j - gap] };
        a[j] = a[j - gap];
      }
      a[j] = temp;
      yield { array: [...a], active: [j] };
    }
  }
  yield { array: [...a], active: [] };
}

export function* selectionSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      yield { array: [...a], active: [minIdx, j] };
      if (a[j] < a[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      yield { array: [...a], active: [i, minIdx] };
    }
  }
  yield { array: [...a], active: [] };
}

export function* insertionSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  for (let i = 1; i < n; i++) {
    let key = a[i];
    let j = i - 1;
    yield { array: [...a], active: [i] };
    while (j >= 0 && a[j] > key) {
      yield { array: [...a], active: [j, j + 1] };
      a[j + 1] = a[j];
      j = j - 1;
    }
    a[j + 1] = key;
    yield { array: [...a], active: [j + 1] };
  }
  yield { array: [...a], active: [] };
}

export function* quickSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  
  function* partition(low: number, high: number): Generator<SortState, number> {
    const pivot = a[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      yield { array: [...a], active: [j, high] };
      if (a[j] < pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        yield { array: [...a], active: [i, j] };
      }
    }
    [a[i + 1], a[high]] = [a[high], a[i + 1]];
    yield { array: [...a], active: [i + 1, high] };
    return i + 1;
  }

  function* qs(low: number, high: number): Generator<SortState> {
    if (low < high) {
      const pi: number = yield* partition(low, high);
      yield* qs(low, pi - 1);
      yield* qs(pi + 1, high);
    }
  }

  yield* qs(0, a.length - 1);
  yield { array: [...a], active: [] };
}

export function* mergeSort(arr: number[]): Generator<SortState> {
  const a = [...arr];

  function* merge(l: number, m: number, r: number): Generator<SortState> {
    const n1 = m - l + 1;
    const n2 = r - m;
    const L = new Array(n1);
    const R = new Array(n2);

    for (let i = 0; i < n1; i++) L[i] = a[l + i];
    for (let j = 0; j < n2; j++) R[j] = a[m + 1 + j];

    let i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
      yield { array: [...a], active: [l + i, m + 1 + j] };
      if (L[i] <= R[j]) {
        a[k] = L[i];
        i++;
      } else {
        a[k] = R[j];
        j++;
      }
      yield { array: [...a], active: [k] };
      k++;
    }

    while (i < n1) {
      a[k] = L[i];
      yield { array: [...a], active: [k] };
      i++;
      k++;
    }

    while (j < n2) {
      a[k] = R[j];
      yield { array: [...a], active: [k] };
      j++;
      k++;
    }
  }

  function* ms(l: number, r: number): Generator<SortState> {
    if (l >= r) return;
    const m = l + Math.floor((r - l) / 2);
    yield* ms(l, m);
    yield* ms(m + 1, r);
    yield* merge(l, m, r);
  }

  yield* ms(0, a.length - 1);
  yield { array: [...a], active: [] };
}

export function* gnomeSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  let i = 0;
  while (i < a.length) {
    if (i === 0 || a[i] >= a[i - 1]) {
      i++;
    } else {
      yield { array: [...a], active: [i, i - 1] };
      [a[i], a[i - 1]] = [a[i - 1], a[i]];
      yield { array: [...a], active: [i, i - 1] };
      i--;
    }
  }
  yield { array: [...a], active: [] };
}

export function* combSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  let gap = n;
  const shrink = 1.3;
  let sorted = false;
  while (!sorted) {
    gap = Math.floor(gap / shrink);
    if (gap <= 1) { gap = 1; sorted = true; }
    for (let i = 0; i + gap < n; i++) {
      yield { array: [...a], active: [i, i + gap] };
      if (a[i] > a[i + gap]) {
        [a[i], a[i + gap]] = [a[i + gap], a[i]];
        sorted = false;
        yield { array: [...a], active: [i, i + gap] };
      }
    }
  }
  yield { array: [...a], active: [] };
}

export function* countingSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const max = Math.max(...a);
  const count = new Array(max + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    count[a[i]]++;
    yield { array: [...a], active: [i] };
  }
  let idx = 0;
  for (let v = 0; v <= max; v++) {
    while (count[v]-- > 0) {
      a[idx] = v;
      yield { array: [...a], active: [idx] };
      idx++;
    }
  }
  yield { array: [...a], active: [] };
}

export function* radixSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const output = new Array(a.length).fill(0);
    const count = new Array(10).fill(0);
    for (let i = 0; i < a.length; i++) {
      count[Math.floor(a[i] / exp) % 10]++;
      yield { array: [...a], active: [i] };
    }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = a.length - 1; i >= 0; i--) {
      const digit = Math.floor(a[i] / exp) % 10;
      output[--count[digit]] = a[i];
    }
    for (let i = 0; i < a.length; i++) {
      a[i] = output[i];
      yield { array: [...a], active: [i] };
    }
  }
  yield { array: [...a], active: [] };
}

export function* oddEvenSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  let sorted = false;
  while (!sorted) {
    sorted = true;
    for (let i = 1; i < n - 1; i += 2) {
      yield { array: [...a], active: [i, i + 1] };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        sorted = false;
        yield { array: [...a], active: [i, i + 1] };
      }
    }
    for (let i = 0; i < n - 1; i += 2) {
      yield { array: [...a], active: [i, i + 1] };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        sorted = false;
        yield { array: [...a], active: [i, i + 1] };
      }
    }
  }
  yield { array: [...a], active: [] };
}

export function* pancakeSort(arr: number[]): Generator<SortState> {
  const a = [...arr];

  function* flip(k: number): Generator<SortState> {
    let left = 0, right = k;
    while (left < right) {
      yield { array: [...a], active: [left, right] };
      [a[left], a[right]] = [a[right], a[left]];
      yield { array: [...a], active: [left, right] };
      left++;
      right--;
    }
  }

  for (let size = a.length; size > 1; size--) {
    let maxIdx = 0;
    for (let i = 1; i < size; i++) {
      yield { array: [...a], active: [i, maxIdx] };
      if (a[i] > a[maxIdx]) maxIdx = i;
    }
    if (maxIdx !== size - 1) {
      if (maxIdx !== 0) yield* flip(maxIdx);
      yield* flip(size - 1);
    }
  }
  yield { array: [...a], active: [] };
}

export function* cycleSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
    let item = a[cycleStart];
    let pos = cycleStart;
    for (let i = cycleStart + 1; i < n; i++) {
      yield { array: [...a], active: [cycleStart, i] };
      if (a[i] < item) pos++;
    }
    if (pos === cycleStart) continue;
    while (item === a[pos]) pos++;
    [a[pos], item] = [item, a[pos]];
    yield { array: [...a], active: [cycleStart, pos] };
    while (pos !== cycleStart) {
      pos = cycleStart;
      for (let i = cycleStart + 1; i < n; i++) {
        yield { array: [...a], active: [cycleStart, i] };
        if (a[i] < item) pos++;
      }
      while (item === a[pos]) pos++;
      [a[pos], item] = [item, a[pos]];
      yield { array: [...a], active: [cycleStart, pos] };
    }
  }
  yield { array: [...a], active: [] };
}

export function* timSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;
  const RUN = 8; // standard insertion-sort run size used by Tim Sort

  function* insertRun(left: number, right: number): Generator<SortState> {
    for (let i = left + 1; i <= right; i++) {
      const temp = a[i];
      let j = i - 1;
      yield { array: [...a], active: [i] };
      while (j >= left && a[j] > temp) {
        yield { array: [...a], active: [j, j + 1] };
        a[j + 1] = a[j];
        j--;
      }
      a[j + 1] = temp;
    }
  }

  function* mergeRuns(l: number, m: number, r: number): Generator<SortState> {
    const left = a.slice(l, m + 1);
    const right = a.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      yield { array: [...a], active: [l + i, m + 1 + j] };
      if (left[i] <= right[j]) a[k++] = left[i++];
      else a[k++] = right[j++];
      yield { array: [...a], active: [k - 1] };
    }
    while (i < left.length) { a[k] = left[i++]; yield { array: [...a], active: [k++] }; }
    while (j < right.length) { a[k] = right[j++]; yield { array: [...a], active: [k++] }; }
  }

  for (let i = 0; i < n; i += RUN) {
    yield* insertRun(i, Math.min(i + RUN - 1, n - 1));
  }
  for (let size = RUN; size < n; size *= 2) {
    for (let left = 0; left < n; left += 2 * size) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid < right) yield* mergeRuns(left, mid, right);
    }
  }
  yield { array: [...a], active: [] };
}

export function* bitonicSort(arr: number[]): Generator<SortState> {
  const a = [...arr];
  const n = a.length;

  function* compAndSwap(i: number, j: number, asc: boolean): Generator<SortState> {
    yield { array: [...a], active: [i, j] };
    if (asc ? a[i] > a[j] : a[i] < a[j]) {
      [a[i], a[j]] = [a[j], a[i]];
      yield { array: [...a], active: [i, j] };
    }
  }

  function* bitonicMerge(lo: number, cnt: number, asc: boolean): Generator<SortState> {
    if (cnt > 1) {
      const k = Math.floor(cnt / 2);
      for (let i = lo; i < lo + k; i++) yield* compAndSwap(i, i + k, asc);
      yield* bitonicMerge(lo, k, asc);
      yield* bitonicMerge(lo + k, cnt - k, asc);
    }
  }

  function* bitonicSortRec(lo: number, cnt: number, asc: boolean): Generator<SortState> {
    if (cnt > 1) {
      const k = Math.floor(cnt / 2);
      yield* bitonicSortRec(lo, k, true);
      yield* bitonicSortRec(lo + k, cnt - k, false);
      yield* bitonicMerge(lo, cnt, asc);
    }
  }

  yield* bitonicSortRec(0, n, true);
  yield { array: [...a], active: [] };
}

export function* stoogeSort(arr: number[]): Generator<SortState> {
  const a = [...arr];

  function* stooge(l: number, h: number): Generator<SortState> {
    yield { array: [...a], active: [l, h] };
    if (a[l] > a[h]) {
      [a[l], a[h]] = [a[h], a[l]];
      yield { array: [...a], active: [l, h] };
    }
    if (h - l + 1 > 2) {
      const t = Math.floor((h - l + 1) / 3);
      yield* stooge(l, h - t);
      yield* stooge(l + t, h);
      yield* stooge(l, h - t);
    }
  }

  yield* stooge(0, a.length - 1);
  yield { array: [...a], active: [] };
}

export function getAlgorithmGenerator(name: AlgorithmName, arr: number[]): Generator<SortState> {
  switch (name) {
    case 'Bubble Sort': return bubbleSort(arr);
    case 'Quick Sort': return quickSort(arr);
    case 'Merge Sort': return mergeSort(arr);
    case 'Insertion Sort': return insertionSort(arr);
    case 'Selection Sort': return selectionSort(arr);
    case 'Cocktail Sort': return cocktailSort(arr);
    case 'Heap Sort': return heapSort(arr);
    case 'Shell Sort': return shellSort(arr);
    case 'Gnome Sort': return gnomeSort(arr);
    case 'Comb Sort': return combSort(arr);
    case 'Counting Sort': return countingSort(arr);
    case 'Radix Sort': return radixSort(arr);
    case 'Odd-Even Sort': return oddEvenSort(arr);
    case 'Pancake Sort': return pancakeSort(arr);
    case 'Cycle Sort': return cycleSort(arr);
    case 'Tim Sort': return timSort(arr);
    case 'Bitonic Sort': return bitonicSort(arr);
    case 'Stooge Sort': return stoogeSort(arr);
    default: return bubbleSort(arr);
  }
}

export function generateRandomArray(size: number = 40): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
}
