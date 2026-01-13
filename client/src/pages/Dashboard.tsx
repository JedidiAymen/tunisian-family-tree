import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import type { Person, Family, Edge, User, PersonForm, EdgeForm } from '@/types';
import { toast } from 'sonner';
import { Plus, Users, GitBranch, MapPin, UserPlus, Link as LinkIcon } from 'lucide-react';

export default function Dashboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false);

  const user: User = JSON.parse(localStorage.getItem('user') || '{}');

  const [personForm, setPersonForm] = useState<PersonForm>({
    first_name: '',
    last_name_raw: '',
    current_city: '',
    notes: '',
  });

  const [edgeForm, setEdgeForm] = useState<EdgeForm>({
    fromPersonId: '',
    toPersonId: '',
    type: 'PARENT_OF',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [peopleData, familiesData] = await Promise.all([
        api<Person[]>('/api/v1/people'),
        api<Family[]>('/api/v1/people/families'),
      ]);
      setPeople(peopleData);
      setFamilies(familiesData);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const cities = [...new Set(people.map((p) => p.current_city).filter(Boolean))];

  const filteredPeople = people.filter((p) => {
    if (selectedFamily !== 'all' && p.family_id !== selectedFamily) return false;
    if (selectedCity !== 'all' && p.current_city !== selectedCity) return false;
    return true;
  });

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api<Person>('/api/v1/people', {
        method: 'POST',
        body: JSON.stringify(personForm),
      });
      toast.success('Person added successfully');
      setPersonDialogOpen(false);
      setPersonForm({ first_name: '', last_name_raw: '', current_city: '', notes: '' });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add person');
    }
  };

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api<Edge>('/api/v1/tree/edges', {
        method: 'POST',
        body: JSON.stringify({
          from_id: edgeForm.fromPersonId,
          to_id: edgeForm.toPersonId,
          type: edgeForm.type,
        }),
      });
      toast.success('Relationship added successfully');
      setEdgeDialogOpen(false);
      setEdgeForm({ fromPersonId: '', toPersonId: '', type: 'PARENT_OF' });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add relationship');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{people.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Families</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{families.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {user.role}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Families</SelectItem>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city!}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
            <>
              <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Person
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Person</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPerson} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={personForm.first_name}
                        onChange={(e) =>
                          setPersonForm({ ...personForm, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name_raw">Last Name</Label>
                      <Input
                        id="last_name_raw"
                        value={personForm.last_name_raw}
                        onChange={(e) =>
                          setPersonForm({ ...personForm, last_name_raw: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_city">Current City</Label>
                      <Input
                        id="current_city"
                        value={personForm.current_city}
                        onChange={(e) =>
                          setPersonForm({ ...personForm, current_city: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={personForm.notes}
                        onChange={(e) =>
                          setPersonForm({ ...personForm, notes: e.target.value })
                        }
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Person
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={edgeDialogOpen} onOpenChange={setEdgeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Add Relationship
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Relationship</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEdge} className="space-y-4">
                    <div className="space-y-2">
                      <Label>From Person</Label>
                      <Select
                        value={edgeForm.fromPersonId}
                        onValueChange={(v) => setEdgeForm({ ...edgeForm, fromPersonId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.first_name} {p.last_name_raw || p.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship Type</Label>
                      <Select
                        value={edgeForm.type}
                        onValueChange={(v: 'PARENT_OF' | 'SPOUSE_OF') =>
                          setEdgeForm({ ...edgeForm, type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PARENT_OF">Parent Of</SelectItem>
                          <SelectItem value="SPOUSE_OF">Spouse Of</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Person</Label>
                      <Select
                        value={edgeForm.toPersonId}
                        onValueChange={(v) => setEdgeForm({ ...edgeForm, toPersonId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.first_name} {p.last_name_raw || p.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Relationship
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* People Table */}
      <Card>
        <CardHeader>
          <CardTitle>People ({filteredPeople.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    {person.first_name} {person.last_name_raw || person.surname}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{person.family_name}</Badge>
                  </TableCell>
                  <TableCell>{person.current_city || '???'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={'/person/' + person.id}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPeople.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No people found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
