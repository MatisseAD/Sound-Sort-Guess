import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// Define local types matching the schema since we can't directly infer from JSON serialization easily without it
export interface Score {
  id: number;
  playerName: string;
  score: number;
  createdAt: string;
}

export interface ScoreInput {
  playerName: string;
  score: number;
}

export function useScores() {
  return useQuery<Score[]>({
    queryKey: [api.scores.list.path],
    queryFn: async () => {
      const res = await fetch(api.scores.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scores");
      const data = await res.json();
      return data as Score[];
    },
  });
}

export function useCreateScore() {
  const queryClient = useQueryClient();
  
  return useMutation<Score, Error, ScoreInput>({
    mutationFn: async (data: ScoreInput) => {
      const res = await fetch(api.scores.create.path, {
        method: api.scores.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit score");
      }
      return await res.json() as Score;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.scores.list.path] });
    },
  });
}
