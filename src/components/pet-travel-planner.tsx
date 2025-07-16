import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, PlaneTakeoff, Heart, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import heroImage from '@/assets/hero-pet-travel.jpg';

interface TravelPlan {
  validations: Array<{ text: string; status: 'OK' | 'ALERTA' | 'INFO' | 'ERRO' }>;
  travelDates: Array<{ text: string; status: 'OK' | 'ALERTA' | 'INFO' | 'ERRO' }>;
  documentation: Array<{ text: string; status: 'OK' | 'ALERTA' | 'INFO' | 'ERRO' }>;
  antiparasitic?: Array<{ text: string; status: 'OK' | 'ALERTA' | 'INFO' | 'ERRO' }>;
  airport?: Array<{ text: string; status: 'OK' | 'ALERTA' | 'INFO' | 'ERRO' }>;
}

export default function PetTravelPlanner() {
  const [formData, setFormData] = useState({
    petName: '',
    species: '',
    destination: '',
    airportUSA: 'N/A',
    birthDate: undefined as Date | undefined,
    vaccineDate: undefined as Date | undefined,
    bloodCollectionDate: undefined as Date | undefined,
    travelDate: undefined as Date | undefined,
    weightKg: 0
  });

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [suggestedBloodDate, setSuggestedBloodDate] = useState<Date | undefined>();

  // Auto-suggest blood collection date when vaccine date changes
  useEffect(() => {
    if (formData.vaccineDate) {
      const suggested = addDays(formData.vaccineDate, 30);
      setSuggestedBloodDate(suggested);
      if (!formData.bloodCollectionDate) {
        setFormData(prev => ({ ...prev, bloodCollectionDate: suggested }));
      }
    }
  }, [formData.vaccineDate]);

  const formatDate = (date: Date) => format(date, 'dd/MM/yyyy', { locale: ptBR });

  const calculatePlan = (): TravelPlan => {
    const { species, destination, birthDate, vaccineDate, bloodCollectionDate, travelDate, airportUSA, weightKg } = formData;
    
    if (!birthDate || !vaccineDate || !bloodCollectionDate || !travelDate) {
      return { validations: [], travelDates: [], documentation: [] };
    }

    const plan: TravelPlan = { validations: [], travelDates: [], documentation: [] };

    if (['Portugal', 'Finlandia', 'Irlanda', 'Malta', 'Noruega'].includes(destination)) {
      // EU Logic
      const minDaysAfterVaccine = differenceInDays(bloodCollectionDate, vaccineDate);
      
      if (minDaysAfterVaccine < 30) {
        plan.validations.push({
          text: `A coleta de sangue (${formatDate(bloodCollectionDate)}) deve ser feita no mínimo 30 dias após a vacina (${formatDate(vaccineDate)}).`,
          status: 'ALERTA'
        });
      } else {
        plan.validations.push({
          text: `Data da Vacina Antirrábica: ${formatDate(vaccineDate)}`,
          status: 'OK'
        });
        plan.validations.push({
          text: `Data da Coleta de Sangue: ${formatDate(bloodCollectionDate)} (Respeitou os 30 dias)`,
          status: 'OK'
        });
      }

      const minTravelDate = addDays(bloodCollectionDate, 90);
      const cviStartDate = addDays(travelDate, -10);
      const govNotificationDate = addDays(travelDate, -2);

      plan.travelDates.push({
        text: `Primeira data possível para a viagem: ${formatDate(minTravelDate)}`,
        status: 'INFO'
      });

      if (travelDate < minTravelDate) {
        plan.travelDates.push({
          text: `Sua data de viagem planejada (${formatDate(travelDate)}) é ANTERIOR à data mínima permitida!`,
          status: 'ALERTA'
        });
      } else {
        plan.travelDates.push({
          text: `Data de viagem planejada: ${formatDate(travelDate)}`,
          status: 'OK'
        });
      }

      plan.documentation.push({
        text: `Janela para Atestado de Saúde e CVI: de ${formatDate(cviStartDate)} a ${formatDate(travelDate)}`,
        status: 'INFO'
      });
      plan.documentation.push({
        text: `Prazo final para notificar o governo de ${destination}: ${formatDate(govNotificationDate)}`,
        status: 'INFO'
      });

      // Antiparasitic treatment
      if (species === 'Cão' && ['Finlandia', 'Irlanda', 'Malta', 'Noruega'].includes(destination)) {
        plan.antiparasitic = [
          {
            text: `Status: OBRIGATÓRIO para cães com destino a ${destination}.`,
            status: 'ALERTA'
          },
          {
            text: `Janela de aplicação: entre ${formatDate(addDays(travelDate, -5))} e ${formatDate(addDays(travelDate, -1))}.`,
            status: 'INFO'
          }
        ];
      } else {
        plan.antiparasitic = [{
          text: 'Status: Não necessário para este destino/espécie.',
          status: 'OK'
        }];
      }

    } else if (destination === 'Estados Unidos' && species === 'Cão') {
      // USA Logic
      const ageAtTravelDays = differenceInDays(travelDate, birthDate);
      const minAgeDays = 6 * 30.44;
      const ageAtVaccineDays = differenceInDays(vaccineDate, birthDate);

      if (ageAtTravelDays < minAgeDays) {
        plan.validations.push({
          text: 'O cão terá menos de 6 meses na data da viagem. A entrada não é permitida.',
          status: 'ALERTA'
        });
      } else {
        plan.validations.push({
          text: `Idade na viagem: OK (terá aprox. ${(ageAtTravelDays/30.44).toFixed(1)} meses).`,
          status: 'OK'
        });
      }

      if (ageAtVaccineDays < 90) {
        plan.validations.push({
          text: 'A vacina antirrábica foi aplicada antes dos 90 dias de vida do filhote.',
          status: 'ALERTA'
        });
      } else {
        plan.validations.push({
          text: `Idade na vacinação: OK (foi vacinado com ${ageAtVaccineDays} dias de vida).`,
          status: 'OK'
        });
      }

      const daysAfterVaccine = differenceInDays(bloodCollectionDate, vaccineDate);
      if (daysAfterVaccine < 30) {
        plan.validations.push({
          text: `A coleta de sangue (${formatDate(bloodCollectionDate)}) deve ser feita no mínimo 30 dias após a vacina.`,
          status: 'ALERTA'
        });
      } else {
        plan.validations.push({
          text: 'Intervalo Vacina -> Coleta: OK (respeitou os 30 dias).',
          status: 'OK'
        });
      }

      const minTravelDateUSA = addDays(bloodCollectionDate, 28);
      const cfrvmStartDate = addDays(travelDate, -30);
      const importPermitStartDate = addDays(travelDate, -10);
      const healthCertStartDate = addDays(travelDate, -5);

      plan.travelDates.push({
        text: `É possível comprar a passagem para viajar a partir de: ${formatDate(minTravelDateUSA)}`,
        status: 'INFO'
      });

      if (travelDate < minTravelDateUSA) {
        plan.travelDates.push({
          text: `Sua data de viagem planejada (${formatDate(travelDate)}) não respeita os 28 dias após a coleta de sangue!`,
          status: 'ALERTA'
        });
      } else {
        plan.travelDates.push({
          text: `Data de viagem planejada: ${formatDate(travelDate)}`,
          status: 'OK'
        });
      }

      plan.documentation.push({
        text: `Janela para emitir o CFRVM: de ${formatDate(cfrvmStartDate)} a ${formatDate(travelDate)}`,
        status: 'INFO'
      });
      plan.documentation.push({
        text: `Janela para emitir o Import Permit: de ${formatDate(importPermitStartDate)} a ${formatDate(travelDate)}`,
        status: 'INFO'
      });
      plan.documentation.push({
        text: `Janela para emitir o Atestado de Saúde: de ${formatDate(healthCertStartDate)} a ${formatDate(travelDate)} (Validade de 5 dias)`,
        status: 'INFO'
      });
      plan.documentation.push({
        text: `Janela para solicitar o CVI: a partir de ${formatDate(cfrvmStartDate)} (Validade de 5 dias após emissão)`,
        status: 'INFO'
      });

      // Airport specific rules
      plan.airport = [];
      if (airportUSA === 'ATLANTA') {
        plan.airport.push({
          text: `Aeroporto de ${airportUSA}: Reservar facility com 60 dias de antecedência.`,
          status: 'ALERTA'
        });
        plan.airport.push({
          text: `Prazo para reserva: até ${formatDate(addDays(travelDate, -60))}`,
          status: 'INFO'
        });
      } else if (airportUSA === 'MIAMI') {
        plan.airport.push({
          text: `Aeroporto de ${airportUSA}: Reservar facility com 15 dias de antecedência.`,
          status: 'ALERTA'
        });
        plan.airport.push({
          text: `Prazo para reserva: até ${formatDate(addDays(travelDate, -15))}`,
          status: 'INFO'
        });
      } else if (airportUSA === 'NOVA YORK') {
        plan.airport.push({
          text: `Aeroporto de ${airportUSA}: Checar regras específicas de facility.`,
          status: 'INFO'
        });
        
        const winterStart = new Date(travelDate.getFullYear(), 11, 15); // Dec 15
        const winterEnd = new Date(travelDate.getFullYear() + 1, 3, 15); // Apr 15
        const isWinterPeriod = travelDate >= winterStart || travelDate <= winterEnd;
        
        if (weightKg > 9 && isWinterPeriod) {
          plan.airport.push({
            text: `Cães com mais de 9kg (${weightKg}kg) não podem viajar no porão para NY neste período.`,
            status: 'ALERTA'
          });
        }
      } else if (airportUSA === 'N/A') {
        plan.airport.push({
          text: 'Nenhum aeroporto selecionado. Verifique as regras específicas.',
          status: 'ALERTA'
        });
      } else {
        plan.airport.push({
          text: `Aeroporto de ${airportUSA}: Não há informações de prazo de reserva no sistema. Verifique diretamente.`,
          status: 'INFO'
        });
      }
    }

    return plan;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedPlan = calculatePlan();
    setPlan(calculatedPlan);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'ALERTA':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-primary" />;
      case 'ERRO':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Pet Travel" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PlaneTakeoff className="h-8 w-8" />
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Planejador de Viagem para Pets</h1>
            <p className="text-xl opacity-90">Organize a viagem do seu pet com segurança e tranquilidade</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Informações da Viagem</CardTitle>
              <CardDescription>
                Preencha os dados do seu pet e planeje a viagem internacional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pet Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Informações do Pet</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="petName">Nome do Pet</Label>
                      <Input
                        id="petName"
                        value={formData.petName}
                        onChange={(e) => setFormData(prev => ({ ...prev, petName: e.target.value }))}
                        placeholder="Ex: Buddy"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="species">Espécie</Label>
                      <Select value={formData.species} onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cão">Cão</SelectItem>
                          <SelectItem value="Gato">Gato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="destination">Destino</Label>
                    <Select value={formData.destination} onValueChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Portugal">Portugal</SelectItem>
                        <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                        <SelectItem value="Finlandia">Finlândia</SelectItem>
                        <SelectItem value="Irlanda">Irlanda</SelectItem>
                        <SelectItem value="Malta">Malta</SelectItem>
                        <SelectItem value="Noruega">Noruega</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.destination === 'Estados Unidos' && formData.species === 'Cão' && (
                    <>
                      <div>
                        <Label htmlFor="airportUSA">Aeroporto de Chegada (EUA)</Label>
                        <Select value={formData.airportUSA} onValueChange={(value) => setFormData(prev => ({ ...prev, airportUSA: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o aeroporto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N/A">N/A</SelectItem>
                            <SelectItem value="ATLANTA">Atlanta</SelectItem>
                            <SelectItem value="FILADELFIA">Filadélfia</SelectItem>
                            <SelectItem value="MIAMI">Miami</SelectItem>
                            <SelectItem value="NOVA YORK">Nova York</SelectItem>
                            <SelectItem value="WASHINGTON">Washington</SelectItem>
                            <SelectItem value="LOS ANGELES">Los Angeles</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.airportUSA === 'NOVA YORK' && (
                        <div>
                          <Label htmlFor="weightKg">Peso do Cão (kg)</Label>
                          <Input
                            id="weightKg"
                            type="number"
                            step="0.1"
                            value={formData.weightKg}
                            onChange={(e) => setFormData(prev => ({ ...prev, weightKg: Number(e.target.value) }))}
                            placeholder="Ex: 9.5"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Datas Importantes</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.birthDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.birthDate ? formatDate(formData.birthDate) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.birthDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, birthDate: date }))}
                            className="pointer-events-auto"
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Data da Vacina Antirrábica</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.vaccineDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.vaccineDate ? formatDate(formData.vaccineDate) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.vaccineDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, vaccineDate: date }))}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data da Coleta de Sangue</Label>
                      {suggestedBloodDate && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Sugestão: {formatDate(suggestedBloodDate)} (30 dias após vacina)
                        </div>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.bloodCollectionDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.bloodCollectionDate ? formatDate(formData.bloodCollectionDate) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.bloodCollectionDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, bloodCollectionDate: date }))}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {suggestedBloodDate && !formData.bloodCollectionDate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, bloodCollectionDate: suggestedBloodDate }))}
                          className="mt-2 text-primary"
                        >
                          Usar data sugerida
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>Data Planejada da Viagem</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.travelDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.travelDate ? formatDate(formData.travelDate) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.travelDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, travelDate: date }))}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <PlaneTakeoff className="mr-2 h-4 w-4" />
                  Gerar Cronograma de Viagem
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Section */}
          {plan && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-2xl text-primary flex items-center gap-2">
                  📅 Cronograma para {formData.petName.toUpperCase()}
                  <Badge variant="secondary">{formData.destination}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {plan.validations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Validações Iniciais</h3>
                    <div className="space-y-2">
                      {plan.validations.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                          <StatusIcon status={item.status} />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.travelDates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Prazos da Viagem</h3>
                    <div className="space-y-2">
                      {plan.travelDates.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                          <StatusIcon status={item.status} />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.documentation.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Documentação e Procedimentos</h3>
                    <div className="space-y-2">
                      {plan.documentation.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                          <StatusIcon status={item.status} />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.antiparasitic && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Tratamento Antiparasitário</h3>
                    <div className="space-y-2">
                      {plan.antiparasitic.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                          <StatusIcon status={item.status} />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.airport && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Aeroporto e Facility</h3>
                    <div className="space-y-2">
                      {plan.airport.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                          <StatusIcon status={item.status} />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}