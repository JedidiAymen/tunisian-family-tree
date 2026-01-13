import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Calendar, MapPin, Briefcase, Heart, Baby, Plane, 
  GraduationCap, ChevronRight, Clock, Users,
  TrendingUp, Home, RefreshCw
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  event_date: string;
  event_year: number;
  city: string;
  country: string;
  person_id: string;
  person_name: string;
  gender: string;
  related_person_id: string;
  related_person_name: string;
}

interface DecadeStats {
  decade: string;
  events: Record<string, number>;
}

interface GenerationStats {
  decade: string;
  count: number;
  maleCount: number;
  femaleCount: number;
  sectors: string[];
}

interface MigrationRoute {
  from_city: string;
  to_city: string;
  count: number;
  people: string[];
}

interface CityStats {
  currentCities: { city: string; count: number }[];
  birthplaces: { city: string; count: number }[];
  movesByDecade: { decade: number; city: string; count: number }[];
}

interface FamilyHub {
  marriageHub: { city: string; marriage_count: number } | null;
  birthHub: { city: string; birth_count: number } | null;
  currentHub: { city: string; resident_count: number } | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const eventIcons: Record<string, React.ReactNode> = {
  BIRTH: <Baby className="h-4 w-4 text-pink-500" />,
  DEATH: <Clock className="h-4 w-4 text-gray-500" />,
  MARRIAGE: <Heart className="h-4 w-4 text-red-500" />,
  DIVORCE: <Heart className="h-4 w-4 text-gray-400" />,
  MOVE: <Plane className="h-4 w-4 text-blue-500" />,
  IMMIGRATION: <Plane className="h-4 w-4 text-green-500" />,
  EMIGRATION: <Plane className="h-4 w-4 text-orange-500" />,
  EDUCATION: <GraduationCap className="h-4 w-4 text-purple-500" />,
  GRADUATION: <GraduationCap className="h-4 w-4 text-indigo-500" />,
  JOB_START: <Briefcase className="h-4 w-4 text-emerald-500" />,
  JOB_END: <Briefcase className="h-4 w-4 text-amber-500" />,
  RETIREMENT: <Home className="h-4 w-4 text-teal-500" />,
  OTHER: <Calendar className="h-4 w-4 text-gray-500" />,
};

const eventColors: Record<string, string> = {
  BIRTH: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  DEATH: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  MARRIAGE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  MOVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  JOB_START: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  GRADUATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [decadeStats, setDecadeStats] = useState<DecadeStats[]>([]);
  const [generationStats, setGenerationStats] = useState<GenerationStats[]>([]);
  const [migrations, setMigrations] = useState<MigrationRoute[]>([]);
  const [cityStats, setCityStats] = useState<CityStats | null>(null);
  const [familyHub, setFamilyHub] = useState<FamilyHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [yearRange, setYearRange] = useState<number[]>([1900, 2025]);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [timelineRes, decadesRes, genRes, migrationsRes, citiesRes, hubRes] = await Promise.all([
        fetch(`${API}/events/timeline?limit=200`, { headers }),
        fetch(`${API}/events/timeline/decades`, { headers }),
        fetch(`${API}/events/generations`, { headers }),
        fetch(`${API}/events/atlas/migrations`, { headers }),
        fetch(`${API}/events/atlas/cities`, { headers }),
        fetch(`${API}/events/atlas/hub`, { headers })
      ]);

      if (timelineRes.ok) setTimeline(await timelineRes.json());
      if (decadesRes.ok) setDecadeStats(await decadesRes.json());
      if (genRes.ok) setGenerationStats(await genRes.json());
      if (migrationsRes.ok) setMigrations(await migrationsRes.json());
      if (citiesRes.ok) setCityStats(await citiesRes.json());
      if (hubRes.ok) setFamilyHub(await hubRes.json());
    } catch (err) {
      console.error('Failed to fetch timeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTimeline = timeline.filter(event => {
    const matchesType = eventFilter === 'all' || event.type === eventFilter;
    const matchesYear = !event.event_year || (event.event_year >= yearRange[0] && event.event_year <= yearRange[1]);
    return matchesType && matchesYear;
  });

  const groupedByYear = filteredTimeline.reduce((acc, event) => {
    const year = event.event_year || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<string | number, TimelineEvent[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Family Timeline & Atlas</h1>
          <p className="text-muted-foreground">Explore your family's journey through time and space</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Family Hub Cards */}
      {familyHub && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-pink-200 dark:border-pink-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Baby className="h-4 w-4" />
                Birth Capital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyHub.birthHub?.city || 'N/A'}</div>
              <p className="text-sm text-muted-foreground">
                {familyHub.birthHub?.birth_count || 0} births
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Marriage Hub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyHub.marriageHub?.city || 'N/A'}</div>
              <p className="text-sm text-muted-foreground">
                {familyHub.marriageHub?.marriage_count || 0} marriages
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Current Hub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyHub.currentHub?.city || 'N/A'}</div>
              <p className="text-sm text-muted-foreground">
                {familyHub.currentHub?.resident_count || 0} residents
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="generations">Generations</TabsTrigger>
          <TabsTrigger value="atlas">Atlas</TabsTrigger>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Family Events
                </span>
                <div className="flex items-center gap-4">
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="BIRTH">Births</SelectItem>
                      <SelectItem value="MARRIAGE">Marriages</SelectItem>
                      <SelectItem value="MOVE">Moves</SelectItem>
                      <SelectItem value="JOB_START">Careers</SelectItem>
                      <SelectItem value="DEATH">Deaths</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm">{yearRange[0]}</span>
                  <Slider
                    value={yearRange}
                    onValueChange={setYearRange}
                    min={1850}
                    max={2025}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm">{yearRange[1]}</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTimeline.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No events found for this filter</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {Object.entries(groupedByYear)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .slice(0, 50)
                      .map(([year, events]) => (
                        <div key={year} className="relative pl-10">
                          {/* Year marker */}
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {String(year).slice(-2)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-muted-foreground">{year}</div>
                            {events.map((event) => (
                              <div
                                key={event.id}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                              >
                                <div className="mt-0.5">
                                  {eventIcons[event.type] || eventIcons.OTHER}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{event.person_name}</span>
                                    <Badge variant="outline" className={eventColors[event.type] || ''}>
                                      {event.type.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {event.title || event.description}
                                    {event.related_person_name && (
                                      <span> with <strong>{event.related_person_name}</strong></span>
                                    )}
                                  </p>
                                  {event.city && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.city}, {event.country}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generations Tab */}
        <TabsContent value="generations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Births by Decade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generationStats.map((gen) => (
                    <div key={gen.decade} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{gen.decade}</span>
                        <span>{gen.count} people</span>
                      </div>
                      <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                        <div
                          className="bg-blue-500 flex items-center justify-center text-xs text-white"
                          style={{ width: `${(gen.maleCount / gen.count) * 100}%` }}
                        >
                          {gen.maleCount > 0 && `${gen.maleCount}M`}
                        </div>
                        <div
                          className="bg-pink-500 flex items-center justify-center text-xs text-white"
                          style={{ width: `${(gen.femaleCount / gen.count) * 100}%` }}
                        >
                          {gen.femaleCount > 0 && `${gen.femaleCount}F`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Sectors by Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generationStats.filter(g => g.sectors.length > 0).map((gen) => (
                    <div key={gen.decade}>
                      <div className="text-sm font-medium mb-2">{gen.decade}</div>
                      <div className="flex flex-wrap gap-1">
                        {gen.sectors.map((sector, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events by Decade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Events by Decade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Decade</th>
                      <th className="text-center py-2">
                        <Baby className="h-4 w-4 mx-auto text-pink-500" />
                      </th>
                      <th className="text-center py-2">
                        <Heart className="h-4 w-4 mx-auto text-red-500" />
                      </th>
                      <th className="text-center py-2">
                        <Plane className="h-4 w-4 mx-auto text-blue-500" />
                      </th>
                      <th className="text-center py-2">
                        <Briefcase className="h-4 w-4 mx-auto text-emerald-500" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {decadeStats.map((decade) => (
                      <tr key={decade.decade} className="border-b hover:bg-accent">
                        <td className="py-2 font-medium">{decade.decade}</td>
                        <td className="text-center py-2">{decade.events.BIRTH || 0}</td>
                        <td className="text-center py-2">{decade.events.MARRIAGE || 0}</td>
                        <td className="text-center py-2">{decade.events.MOVE || 0}</td>
                        <td className="text-center py-2">{decade.events.JOB_START || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Atlas Tab */}
        <TabsContent value="atlas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Birthplaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cityStats?.birthplaces.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-2">
                    {cityStats?.birthplaces.slice(0, 10).map((city, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📍'}</span>
                          <span>{city.city}</span>
                        </div>
                        <Badge variant="secondary">{city.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Current Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cityStats?.currentCities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-2">
                    {cityStats?.currentCities.slice(0, 10).map((city, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{idx === 0 ? '🏠' : idx === 1 ? '🏡' : '🏘️'}</span>
                          <span>{city.city}</span>
                        </div>
                        <Badge variant="secondary">{city.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Migrations Tab */}
        <TabsContent value="migrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Migration Routes
              </CardTitle>
              <CardDescription>
                Most common family migration patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {migrations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No migration data yet</p>
              ) : (
                <div className="space-y-3">
                  {migrations.map((route, idx) => (
                    <div key={idx} className="p-4 rounded-lg border hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{route.from_city}</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          <Plane className="h-5 w-5 text-blue-500" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{route.to_city}</span>
                        </div>
                        <Badge>{route.count} people</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {route.people.slice(0, 5).join(', ')}
                        {route.people.length > 5 && ` and ${route.people.length - 5} more`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
