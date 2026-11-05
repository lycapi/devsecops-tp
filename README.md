README

![CI Workflow](https://github.com/lycapi/devsecops-tp/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/lycapi/devsecops-tp/actions/workflows/github-codeql.yml/badge.svg)



Etape 1: SECRETS
Question : Un collègue a poussé une clé AWS il y a 3 jours puis l'a supprimée dans un commit. Est-ce sécurisé ?

Réponse : Non, supprimer la ligne dans un nouveau commit ne l'efface pas de l'historique Git. N'importe qui peut retrouver la clé dans les commits précédents.
Ce qu'il faut faire dans l'ordre: 
1.Révoquer la clé dans la console AWS
2.Remplacer la clé en régénerant un secret dans Github Secrets
3.Auditer les journaux AWS CloudTrail pour vérifier si elle a été exploité
4.Avertir l'équipe de sécurité


Etape 2: Dépendances

      | Critical | High |	Moderate | Low |
Avant	|	   0     |  5   |    16    |  7  |
Après	|		 0     |  0   |    16    |  4  |


Etape 3: Code: 3 failles

Route  | Nom de la faille                                           | URL d'attaque                                                | Ce qu'elle permet & Correction
/hello |  Reflected Cross-Site Scripting (XSS)                      |  http://localhost:3000/hello?name=<script>alert(1)</script>  | Permet : L'exécution de code JavaScript arbitraire dans le navigateur de la victime.   Correction : Échapper le HTML du paramètre name.   
/ping  |  Injection de commande système (Uncontrolled command line) |  http://localhost:3000/ping?host=127.0.0.1;cat /etc/passwd   | Permet : L'exécution de commandes système arbitraires sur le serveur hôte.   Correction : Validation Regex stricte de l'hôte et utilisation de execFile.   
/prefs |  Prototype Pollution                                       |  http://localhost:3000/prefs?__proto__[polluted]=true        | Permet : La modification globale du prototype des objets JavaScript (risque de Déni de Service ou RCE).   Correction : Ne copier que les clés explicitement autorisées (theme, lang).   


Etape 4: Pipeline durci

Question : En mars 2026, 76 des 77 tags de trivy-action ont été détournés. Un workflow avec @v0.34.0 était-il touché ? 
Et un workflow épinglé par SHA ?   
Le workflow avec @v0.34.0 était touché : un tag Git n'est qu'un pointeur modifiable. 
L'attaquant a réécrit le tag pour pointer vers un commit malveillant.   
Le workflow avec SHA n'était pas touché : le hash cryptographique d'un commit est immuable. 
Il est mathématiquement impossible d'altérer le code sans modifier son SHA


Etape 5: Images Docker 

Quelle couche pèse le plus ?

La couche de l'image de base (FROM node:22). 
L'image officielle Node.js basée sur Debian pèse à elle seule près d'1 Go car 
elle embarque un système d'exploitation complet avec de nombreuses bibliothèques système et outils de compilation inutiles en production.   

Un fichier .env serait-il dans l'image s'il existait ?

Oui. L'instruction COPY . . copie l'intégralité du dossier local dans l'image conteneurisée. 
En l'absence de fichier .dockerignore à cette étape, tout fichier .env présent à la racine est copié, 
exposant les variables d'environnement et secrets directement dans le conteneur.   

Et le dossier .git ?

Oui, également. Pour la même raison, COPY . . inclut le dossier masqué .git. 
Cela alourdit l'image de plusieurs dizaines de mégaoctets et expose tout l'historique des commits 
ainsi que les métadonnées du dépôt au sein de l'image Docker.



Image	    | Taille	| Nb de couches	| CVE HIGH | CVE CRITICAL |
Naïve			|  1.7GB  |       11      |    522   |      20      |
Optimisée	|  249MB  |        8      |     10   |       0      |		


devsecops-tp:naif (debian 12.15)
================================
Total: 532 (HIGH: 512, CRITICAL: 20)

Node.js (node-pkg)
==================
Total: 10 (HIGH: 10, CRITICAL: 0)



Etape 6: AWS et Couts
6.1
```mermaid
graph TD
    subgraph Client ["🌐 Internet"]
        Users["👥 Utilisateurs"]
    end

    subgraph AWS ["☁️ AWS Cloud (eu-west-3)"]
        WAF["🛡️ AWS WAF<br/>(Filtrage OWASP & Rate Limiting)"]

        subgraph VPC ["🔒 VPC (Virtual Private Cloud)"]
            subgraph PublicSubnets ["🌐 Sous-réseaux Publics"]
                ALB["⚖️ Application Load Balancer (ALB)<br/>(HTTPS / Certificat ACM)"]
            end

            subgraph PrivateSubnets ["🔒 Sous-réseaux Privés"]
                ECS["🐳 AWS ECS Fargate / App Runner<br/>(Conteneur Node.js v22-alpine)"]
            end
        end

        subgraph SecurityObs ["⚙️ Sécurité & Observabilité"]
            ECR["📦 Amazon ECR<br/>(Scan Trivy & Lifecycle Policy)"]
            KMS["🔑 AWS KMS<br/>(Chiffrement des clés)"]
            CW["📊 Amazon CloudWatch<br/>(Centralisation des logs)"]
        end
    end

    Users -->|HTTPS| WAF
    WAF --> ALB
    ALB --> ECS
    ECS -.-> ECR
    ECS -.-> KMS
    ECS -.-> CW



    6.2

   Scénario |                       Détail du calcul                               |  Coût estimé par mois
 Scénario A : (0,25*0,04048) + (0,5*0,004445) = 0,01012 + 0,0022225 = 0,0123425$/h | 0,0123425*730 = 9,01$/mois
 Scénario B : (0,25*0,03238) + (0,5*0,003556) = 0,008095 + 0,001778 = 0,009873$/h  | 0,009873*730 = 7,2073$ =7,21$/mois
 Scénario C :    730h ~= 4,345 semaines & 12h*5j*4,345=260,71 h/mois               | 260,71*0,0123425 = 3,22$/mois


1. Coût mensuel de la NAT Gateway 
Coût NAT Gateway = 730h*0,045$/heure = 32,85$/mois
Comparaison : La NAT Gateway seule $32,85 coûte plus de 3,6 fois le prix d'exécution du conteneur applicatif lui-même 9,01$. Le coût total de l'infrastructure monte alors à 41,86$/mois.
Conclusion: En environnement de démonstration, de staging ou pour de petites architectures à faible budget, la NAT Gateway introduit un coût fixe disproportionné.

