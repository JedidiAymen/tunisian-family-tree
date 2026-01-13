// ============================================================
// TypeScript Types for Tunisian Family Tree
// ============================================================

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  family_id: string;
  first_name?: string;
  last_name?: string;
  current_city?: string;
}

export interface Family {
  id: string;
  name: string;
  created_at?: string;
}

export interface Person {
  id: string;
  family_id: string;
  first_name: string;
  last_name_raw?: string;
  surname_id?: string;
  surname?: string;
  region_id?: string;
  region?: string;
  expertise_id?: string;
  birth_date?: string;
  death_date?: string;
  notes?: string;
  current_city?: string;
  family_name?: string;
  canEdit?: boolean;
}

export interface Edge {
  id: string;
  family_id: string;
  from: string;
  to: string;
  type: 'PARENT_OF' | 'SPOUSE_OF';
}

export interface GraphNode {
  id: string;
  label: string;
  family_id: string;
  family_name: string;
  current_city?: string;
  canEdit?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: Edge[];
}

export interface PersonForm {
  first_name: string;
  last_name_raw: string;
  current_city: string;
  notes: string;
}

export interface EdgeForm {
  fromPersonId: string;
  toPersonId: string;
  type: 'PARENT_OF' | 'SPOUSE_OF';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
