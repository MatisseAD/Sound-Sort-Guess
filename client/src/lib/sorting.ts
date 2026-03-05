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
  'Shell Sort'
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
    default: return bubbleSort(arr);
  }
}

export function generateRandomArray(size: number = 40): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
}
