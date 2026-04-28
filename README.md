# Jogo da Memória — Magalu Cloud

Jogo da memória com termos de cloud computing da Magalu Cloud.

## Requisitos

- Node.js 18+

## Instalação

```bash
npm install
```

## Executar localmente

```bash
npm start
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
├── server.js           # Backend Express (upload de imagens + config)
├── package.json
├── public/             # Arquivos estáticos (servidos pelo Express)
│   ├── index.html      # Página principal
│   ├── css/style.css   # Estilos (Aracy Design System)
│   ├── js/app.js       # Lógica do jogo
│   └── assets/         # Assets estáticos (logo, ícones)
├── uploads/            # Imagens enviadas pelo usuário (persistidas no servidor)
└── game-config.json    # Configurações salvas (gerado automaticamente)
```

## Configurar Block Storage na VM (MGC)

Caso você tenha anexado um Block Storage à sua VM na Magalu Cloud, siga os passos abaixo para reconhecê-lo e montá-lo.

```bash
# 1. Verificar os discos disponíveis (o novo volume aparece geralmente como /dev/vdb)
lsblk

# 2. Formatar o disco (apenas na primeira vez — apaga todos os dados)
sudo mkfs.ext4 /dev/vdb

# 3. Criar o ponto de montagem
sudo mkdir -p /mnt/blockstorage

# 4. Montar o volume
sudo mount /dev/vdb /mnt/blockstorage

# 5. Verificar se montou corretamente
df -h /mnt/blockstorage

# 6. Tornar a montagem persistente (sobrevive ao reboot)
echo '/dev/vdb /mnt/blockstorage ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

### Persistir uploads no Block Storage

Para que as imagens enviadas no jogo sejam salvas no Block Storage:

```bash
# Mover a pasta de uploads para o block storage
sudo mv /opt/memory-game/uploads /mnt/blockstorage/uploads

# Criar link simbólico para o app continuar funcionando
sudo ln -s /mnt/blockstorage/uploads /opt/memory-game/uploads
```

## Deploy em VM simples

```bash
# 1. Copiar arquivos para a VM
scp -r . user@vm:/opt/memory-game

# 2. Na VM, instalar dependências e iniciar
cd /opt/memory-game
npm install --production
PORT=80 node server.js

# Ou com PM2 para manter rodando:
npm install -g pm2
PORT=80 pm2 start server.js --name memory-game
pm2 save
pm2 startup
```

### Com Nginx como reverse proxy (recomendado)

```nginx
server {
    listen 80;
    server_name seujogo.magalu.cloud;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 5M;
    }
}
```

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/uploads` | Lista imagens enviadas |
| `POST` | `/api/upload` | Upload de imagem (multipart/form-data, campo: `image`) |
| `DELETE` | `/api/uploads/:filename` | Deleta uma imagem |
| `GET` | `/api/config` | Carrega configuração do jogo |
| `POST` | `/api/config` | Salva configuração do jogo |
