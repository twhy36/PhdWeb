using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.AspNetCore.StaticFiles;

namespace Phd.WebHost
{
    public class Startup
    {
        private StaticFileOptions NoCacheStaticFileOptions => new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                var headers = ctx.Context.Response.GetTypedHeaders();
                headers.CacheControl = new Microsoft.Net.Http.Headers.CacheControlHeaderValue
                {
                    Public = true,
                    MaxAge = TimeSpan.FromDays(0)
                };
            }
        };

        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSpaStaticFiles(config =>
            {
                config.RootPath = "dist";
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            //check uri_state cookie for potential login redirect
            app.Use(async (context, next) =>
            {
                if (context.Request.Cookies.ContainsKey("uri_state") && (context.Request.Path.Value == "" || context.Request.Path.Value == "/"))
                {
                    context.Response.Cookies.Delete("uri_state");

                    if (context.Request.Query.ContainsKey("code"))
                    {
                        var uri = context.Request.Cookies["uri_state"];
                        context.Response.Redirect(uri + context.Request.QueryString.Value);
                        return;
                    }
                }

                await next();
            });

            //Custom redirect for salestally.pulte.com url
            app.Use(async (context, next) =>
            {
                if (context.Request.Host.Host.ToLower().StartsWith("salestally"))
                {
                    context.Response.Redirect($"https://{context.Request.Host.Host.Replace("salestally", "salesportal")}/salesportal/salestally");
                }
                else
                {
                    await next();
                }
            });

            var rewriteOptions = new RewriteOptions();
            rewriteOptions.AddRedirectToHttpsPermanent();
            rewriteOptions.AddRedirect(@"^$", "/salesportal/index.html");
            app.UseRewriter(rewriteOptions);

            app.UseStaticFiles();

            var contentTypeProvider = new FileExtensionContentTypeProvider();
            contentTypeProvider.Mappings.Add(".properties", "text/plain");
            app.UseSpaStaticFiles(new StaticFileOptions
            {
                ContentTypeProvider = contentTypeProvider
            });

            //write uri_state cookie
            app.Use(async (context, next) =>
            {
                context.Response.Cookies.Append("uri_state", context.Request.Path.Value,
                    new CookieOptions
                    {
                        SameSite = SameSiteMode.Lax,
                        MaxAge = TimeSpan.FromMinutes(5)
                    });
                await next();
            });

            app.Map("/designtool", app1 =>
            {
                app1.UseSpa(spa =>
                 {
                     spa.Options.DefaultPage = "/designtool/index.html";
                     spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                 });
            });

            app.Map("/choiceadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/choiceadmin/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/salesadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesadmin/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/salesportal", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesportal/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/homedesigner", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/homedesigner/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/colormanagement", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/colormanagement/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });
        }
    }
}
