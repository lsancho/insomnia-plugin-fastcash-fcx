# Getting Started
1.	Instale o plugin `insomnia-plugin-fastcash-fcx`
2.  No `Base Environment` do Insomnia defina a variavel `use-fastcash-fcx-on` que é o nome do objeto que contém os hosts da api

    exemplo:
    ```json
    {
        "use-fastcash-fcx-on": "api-fastcash",
        "api-fastcash": {
            "url": "https://dev.meu.cash/apiv10"
        }
    }
    ```
3. Pode ser no `Base Environment` ou qualquer outro, lá você precisa configurar uma propriedade `fastcash` onde terá as credenciais dentro de `$.credentials.apiKey` e  `$.credentials.apiSecret`
    exemplo:
    ```json
    {
        "fastcash": {
            "name": "meu-nome",
            "credentials": {
                "apiKey": "c29e2a13-b442-489a-8f8b-39436ecbb02f",
                "apiSecret": "BialAI1Bf0P06g6NSu/efAv1OD4+K/Ac0nEwESn9PAQ="
            }
        }
    }
    ```

4.  Pronto, todo request em que a URL está dentro de uma das propriedades do objeto escolhido terá um FCX injetado no Header (de acordo com as configurações)


