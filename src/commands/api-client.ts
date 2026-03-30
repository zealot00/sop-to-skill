export interface GenerateFromExtractedRequest {
  skill_name: string;
  extracted_data: {
    constraints: any[];
    decisions: any[];
    roles: any[];
  };
}

export interface GenerateFromExtractedResponse {
  generated_yaml: string;
  provider: string;
  model: string;
}

export async function generateFromExtracted(
  apiUrl: string,
  apiKey: string,
  req: GenerateFromExtractedRequest
): Promise<GenerateFromExtractedResponse> {
  const response = await fetch(`${apiUrl}/api/v1/skills/generate-from-extracted`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json() as { data: GenerateFromExtractedResponse };
  return data.data;
}