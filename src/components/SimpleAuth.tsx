/**
 * Componente de autenticação simples para desenvolvimento
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface SimpleAuthProps {
  children: React.ReactNode;
}

export function SimpleAuth({ children }: SimpleAuthProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Verificar se já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        logger.info('User authenticated', { userId: session.user.id }, 'SimpleAuth');
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        logger.info('Auth state changed', { event, userId: session?.user?.id }, 'SimpleAuth');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Criar conta
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && !data.session) {
          toast({
            title: "Conta criada!",
            description: "Verifique seu email para confirmar a conta.",
          });
        }
      } else {
        // Fazer login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao DocFlow-AI.",
        });
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Erro ao criar conta" : "Erro no login",
        description: error.message,
        variant: "destructive",
      });
      
      logger.error('Auth error', error, { isSignUp }, 'SimpleAuth');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const handleQuickAuth = async () => {
    setLoading(true);
    
    // Login com usuário de teste
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'teste@docflow.com',
        password: '123456789',
      });

      if (error) {
        // Se não existe, criar
        const { error: signUpError } = await supabase.auth.signUp({
          email: 'teste@docflow.com',
          password: '123456789',
        });
        
        if (signUpError) throw signUpError;
        
        toast({
          title: "Usuário de teste criado",
          description: "Use: teste@docflow.com / 123456789",
        });
      } else {
        toast({
          title: "Login automático realizado!",
          description: "Logado como usuário de teste.",
        });
      }
    } catch (error: any) {
      logger.error('Quick auth error', error, undefined, 'SimpleAuth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🚀 DocFlow-AI</CardTitle>
            <p className="text-gray-600">
              {isSignUp ? 'Criar conta' : 'Fazer login'} para continuar
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              </Button>
            </form>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm"
              >
                {isSignUp ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar agora'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button 
                variant="outline" 
                onClick={handleQuickAuth}
                className="w-full"
                disabled={loading}
              >
                🚀 Login Rápido (Desenvolvimento)
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Cria/usa: teste@docflow.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header com info do usuário */}
      <div className="bg-blue-50 border-b px-4 py-2 flex justify-between items-center">
        <div className="text-sm text-blue-700">
          👤 Logado como: <strong>{user.email}</strong>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sair
        </Button>
      </div>
      
      {/* Conteúdo principal */}
      {children}
    </div>
  );
}
